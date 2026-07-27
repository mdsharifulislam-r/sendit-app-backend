import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Request, Response } from 'express';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GatewayService implements OnModuleInit {
  private readonly logger = new Logger('GatewayService');
  private prefixToPortMap = new Map<string, number>();
  private serviceToPortMap = new Map<string, number>();
  private defaultPort = 3000; // Default to root service port

  constructor(
    private configService: ConfigService
  ) {

  }

  onModuleInit() {
    this.discoverRoutes();
  }

  private discoverRoutes() {
    this.logger.log('Starting dynamic codebase analysis to map services and routes...');
    const workspaceRoot = process.cwd();
    const nestCliPath = path.join(workspaceRoot, 'nest-cli.json');

    if (!fs.existsSync(nestCliPath)) {
      this.logger.error('nest-cli.json not found in workspace root. Using default fallback.');
      return;
    }

    try {
      const nestCli = JSON.parse(fs.readFileSync(nestCliPath, 'utf8'));
      const projects = nestCli.projects || {};

      for (const [projectName, projectConfig] of Object.entries<any>(projects)) {
        if (projectName === 'gateway' || projectConfig.type !== 'application') {
          continue;
        }

        const sourceRoot = projectConfig.sourceRoot || `apps/${projectName}/src`;
        const mainTsPath = path.join(workspaceRoot, sourceRoot, 'main.ts');

        let port = 3000;
        if (fs.existsSync(mainTsPath)) {
          const mainContent = fs.readFileSync(mainTsPath, 'utf8');
          const portRegex = /process\.env\.([A-Z0-9_]+)\s*(?:\?\?\s*(\d+)|\|\s*(\d+))?/;
          const match = mainContent.match(portRegex);
          if (match) {
            const envVarName = match[1];
            port = this.configService.get(getPortName(projectName as any)) || 3000;
          }
        }

        // Register project name to port mapping for sockets
        this.serviceToPortMap.set(projectName, port);

        // Keep track of root port
        if (projectName === 'root') {
          this.defaultPort = port;
        }

        // Find controllers
        const controllerFiles = globSync(`${sourceRoot}/**/*.controller.ts`);
        const prefixes: string[] = [];

        for (const file of controllerFiles) {
          try {
            const content = fs.readFileSync(file, 'utf8');
            const controllerRegex = /@Controller\(\s*(?:['"`](.*?)['"`])?\s*\)/;
            const match = content.match(controllerRegex);
            if (match) {
              const prefix = match[1] || '';
              if (prefix) {
                prefixes.push(prefix);
                this.prefixToPortMap.set(prefix, port);
              }
            }
          } catch (err: any) {
            this.logger.warn(`Failed to parse controller file ${file}: ${err.message}`);
          }
        }

        this.logger.log(`Discovered service "${projectName}" on port ${port} with route prefixes: ${JSON.stringify(prefixes)}`);
      }

      this.logger.log(`Dynamic routing initialized. Registered prefixes: ${JSON.stringify(Array.from(this.prefixToPortMap.keys()))}`);
    } catch (err: any) {
      this.logger.error(`Error during codebase discovery: ${err.message}`, err.stack);
    }
  }

  async forward(req: Request, res: Response) {
    const originalUrl = req.originalUrl;

    // Determine target port based on path prefix
    let targetPort = this.defaultPort;
    const pathParts = req.path.split('/').filter(Boolean); // e.g. ['api', 'v1', 'user', 'profile']

    // Handle Socket.io HTTP polling requests
    if (pathParts[0] === 'socket.io') {
      const serviceParam = req.query.service as string;
      if (serviceParam) {
        const resolvedPort = this.serviceToPortMap.get(serviceParam);
        if (resolvedPort) {
          targetPort = resolvedPort;
        }
      }
    } else {
      // Find the prefix segment (first segment after global prefix 'api/v1')
      let prefixCandidate = '';
      if (pathParts[0] === 'api' && pathParts[1] === 'v1') {
        prefixCandidate = pathParts[2] || '';
      } else {
        prefixCandidate = pathParts[0] || '';
      }

      if (prefixCandidate && this.prefixToPortMap.has(prefixCandidate)) {
        targetPort = this.prefixToPortMap.get(prefixCandidate)!;
      }
    }

    const host = this.configService.get('IP_ADDRESS') || 'localhost';
    const targetUrl = `http://${host}:${targetPort}${originalUrl}`;

    this.logger.debug(`Proxying request: ${req.method} ${originalUrl} -> ${targetUrl}`);

    // Build headers to send to target service
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const headers = {
      ...req.headers,
      host: `${host}:${targetPort}`,
      'x-forwarded-for': Array.isArray(clientIp) ? clientIp.join(', ') : clientIp,
      'x-forwarded-host': req.headers['host'] || '',
      'x-forwarded-proto': req.secure ? 'https' : 'http',
    };

    const options: http.RequestOptions = {
      hostname: host,
      port: targetPort,
      path: originalUrl,
      method: req.method,
      headers: headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      // Forward status code and headers to client response
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers as any);
      // Pipe response body stream
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      this.logger.error(`Proxy request error for ${targetUrl}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({
          statusCode: 502,
          message: 'Bad Gateway',
          error: err.message,
          target: targetUrl,
        });
      }
    });

    // Pipe client request body stream to proxy request
    req.pipe(proxyReq);
  }

  setupUpgradeHandler(server: any) {
    server.on('upgrade', (req: any, socket: any, head: any) => {
      const host = this.configService.get('IP_ADDRESS') || 'localhost';
      const urlObj = new URL(req.url, `http://${req.headers.host || host}`);
      
      // Check if it's a socket.io path
      if (!urlObj.pathname.startsWith('/socket.io')) {
        socket.destroy();
        return;
      }

      const serviceParam = urlObj.searchParams.get('service');
      let targetPort = this.defaultPort;

      if (serviceParam) {
        const resolvedPort = this.serviceToPortMap.get(serviceParam);
        if (resolvedPort) {
          targetPort = resolvedPort;
        }
      }

      this.logger.debug(`Proxying socket upgrade request to ws://${host}:${targetPort}${req.url}`);

      const options = {
        port: targetPort,
        host: host,
        method: req.method,
        path: req.url,
        headers: req.headers,
      };

      const proxyReq = http.request(options);
      
      proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
        // Write status and headers back to client
        let responseHeaders = `HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n`;
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (Array.isArray(value)) {
            for (const val of value) {
              responseHeaders += `${key}: ${val}\r\n`;
            }
          } else if (value !== undefined) {
            responseHeaders += `${key}: ${value}\r\n`;
          }
        }
        responseHeaders += '\r\n';
        socket.write(responseHeaders);

        // Pipe bidirectional streams
        proxySocket.pipe(socket);
        socket.pipe(proxySocket);
      });

      proxyReq.on('error', (err) => {
        this.logger.error(`Socket proxy error for ws://${host}:${targetPort}${req.url}: ${err.message}`);
        socket.destroy();
      });

      proxyReq.end();
    });
  }
}

function getPortName(projectName: "trip" | "payment" | "admin" | 'root' | 'communication' | "booking") {
  switch (projectName) {
    case "trip":
      return "TRIP_SERVER_PORT";
    case "payment":
      return 'PAYMENT_PORT';
    case "admin":
      return 'ADMIN_PORT';
    case "root":
      return 'PORT';
    case "communication":
      return 'COMMUNICATION_PORT';
    case "booking":
      return 'BOOKING_PORT';
  }
}
import { NestFactory } from '@nestjs/core';

import { Logger } from '@nestjs/common';
import 'reflect-metadata';
import { getCorsOrigin } from 'utils/config/cors';
import { loadAwsSecrets } from 'utils/helper-modules/secret-manager/load-aws-secrets';
import { GatewayModule } from './gateway.module';
import { GatewayService } from './gateway.service';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  await loadAwsSecrets();

  const app = await NestFactory.create(GatewayModule, {
    logger: ['log', 'error', 'warn', 'debug'],
    bodyParser: false, // Disable body parser to allow raw stream proxying
  });

  app.enableCors({
    origin: getCorsOrigin(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.enableShutdownHooks();

  const port = process.env.GATEWAY_PORT ?? 3010;
  const host = process.env.IP_ADDRESS || '0.0.0.0';

  await app.listen(port, host, () => {
    logger.log(`API Gateway running at http://${host}:${port}/`);
    logger.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });

  // Bind WebSocket upgrade handler to proxy Socket.io connections
  const server = app.getHttpServer();
  const gatewayService = app.get(GatewayService);
  gatewayService.setupUpgradeHandler(server);
}

bootstrap();

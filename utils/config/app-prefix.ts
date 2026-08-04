import { INestApplication, RequestMethod } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * ALB forwards /trip/* with the /trip prefix intact.
 * Strip it so Nest routes match (/api/v1/trip, /health, /docs).
 * Local dev: leave SERVICE_PATH_PREFIX unset.
 */
export function configureAlbPathPrefix(app: INestApplication) {
  const prefix = process.env.SERVICE_PATH_PREFIX;
  if (!prefix) return;

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const url = req.url;
    if (url === prefix || url.startsWith(`${prefix}/`)) {
      req.url = url.slice(prefix.length) || '/';
    }
    next();
  });
}

/** Sets api/v1 prefix but keeps GET /health at root for ALB + ECS health checks. */
export function configureGlobalPrefix(app: INestApplication) {
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
}

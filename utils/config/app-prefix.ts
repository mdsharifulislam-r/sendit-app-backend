import { INestApplication, RequestMethod } from '@nestjs/common';

/** Sets api/v1 prefix but keeps GET /health at root for ALB + ECS health checks. */
export function configureGlobalPrefix(app: INestApplication) {
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
}

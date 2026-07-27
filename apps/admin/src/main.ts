import { NestFactory } from '@nestjs/core';
import { LoggingInterceptor } from 'utils/inspectors/logger.inspector';
import { ResponseInterceptor } from 'utils/inspectors/response.interceptor';
import { ValidationPipe, Logger } from '@nestjs/common';
import { formatValidationErrors } from 'utils/errors/validator-error';
import { GlobalExceptionFilter } from 'utils/filters/global-exception.filter';
import 'reflect-metadata';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AdminModule } from './admin.module';




const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AdminModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: formatValidationErrors,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Backend API')
    .setDescription(
      'A production-ready NestJS backend template with Auth, User management, File uploads, Email, WebSockets, Redis cache, and Kafka support.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });


  // await generateSwagger(app);


  const port = process.env.ADMIN_PORT ?? 3003;
  const host = process.env.IP_ADDRESS || '0.0.0.0';

  await app.listen(port, host, () => {
    logger.log(`Server running at http://${host}:${port}/api/v1/`);
    logger.log(`Swagger docs at http://${host}:${port}/docs`);
    logger.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

bootstrap();

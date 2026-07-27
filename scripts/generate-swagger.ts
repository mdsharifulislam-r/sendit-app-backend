import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import fs from 'fs';
import path from 'path';
import { INestApplication } from '@nestjs/common';
export async function generateSwagger(app: INestApplication) {
  //   const app = await NestFactory.create(AppModule);
  
  //   const config = new DocumentBuilder()
  //     .setTitle('API')
  //     .setDescription('Auto generated')
//     .setVersion('1.0')
//     .addBearerAuth(
//       {
  //         type: 'http',
  //         scheme: 'bearer',
//       },
//       'access-token',
//     )
//     .build();

//   const document = SwaggerModule.createDocument(app, config);
const outputDir = path.join(process.cwd(), "docs");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}
  fs.writeFileSync(
    './docs/swagger.json',
    JSON.stringify(document, null, 2),
  );

  await app.close();
}


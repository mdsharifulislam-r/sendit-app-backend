import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from './report.entity';
import { RedisCacheModule } from 'utils/helper-modules/cache/cache.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { S3Service } from 'utils/helper-modules/upload/s3.service';
import { AuthModule } from 'apps/root/src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Report.name, schema: ReportSchema }]),
    RedisCacheModule,
    SqsModule,
    AuthModule
  ],
  controllers: [ReportController],
  providers: [ReportService, S3Service],
})
export class ReportModule { }

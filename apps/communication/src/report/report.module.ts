import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from './report.entity';
import { RedisCacheModule } from 'utils/helper-modules/cache/cache.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { S3Service } from 'utils/helper-modules/upload/s3.service';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { Booking, BookingSchema } from 'apps/booking/src/booking.entity';
import { Chat, ChatSchema } from '../chat/chat.entity';
import { StripeModule } from 'utils/helper-modules/stripe/stripe.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Chat.name, schema: ChatSchema },

    ]),
    RedisCacheModule,
    SqsModule,
    AuthModule,
    StripeModule
  ],
  controllers: [ReportController],
  providers: [ReportService, S3Service],
})
export class ReportModule { }

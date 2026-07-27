import { Module } from '@nestjs/common';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from 'apps/booking/src/booking.entity';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]), SqsModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule { }

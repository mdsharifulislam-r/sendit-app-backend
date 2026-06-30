import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from 'apps/booking/src/booking.entity';
import { Report, ReportSchema } from 'apps/communication/src/report/report.entity';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { Ticket, TicketSchema } from './ticket.entity';
import { RedisCacheModule } from 'utils/helper-modules/cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Report.name, schema: ReportSchema },
      { name: Ticket.name, schema: TicketSchema }
    ]),

    AuthModule,
    SqsModule,
    RedisCacheModule
  ],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule { }

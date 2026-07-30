import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { Wallet, WalletSchema } from 'apps/payment/src/wallet/wallet.entity';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { Trip, TripSchema } from 'apps/trip/src/trip.entity';
import { Transaction, TransactionSchema } from 'apps/payment/src/transaction/transaction.entity';
import { RiskSettingsModule } from './risk-settings/risk-settings.module';
import { TicketModule } from './ticket/ticket.module';
import { Booking, BookingSchema } from 'apps/booking/src/booking.entity';
import { Report, ReportSchema } from 'apps/communication/src/report/report.entity';
import { Ticket, TicketSchema } from './ticket/ticket.entity';
import { RiskyItems, RiskyItemsSchema } from './risk-settings/risk-settings.entity';
import { Review, ReviewSchema } from 'apps/trip/src/review/review.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('DB_URI') || 'mongodb://localhost:27017/sendit',
      }),
    }),

    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Trip.name, schema: TripSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Report.name, schema: ReportSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: RiskyItems.name, schema: RiskyItemsSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),

    AuthModule,

    AuditLogsModule,

    RiskSettingsModule,

    TicketModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule { }

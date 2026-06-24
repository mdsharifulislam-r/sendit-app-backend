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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('DB_URI'),
      }),
    }),

    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Trip.name, schema: TripSchema },
      { name: Transaction.name, schema: TransactionSchema }
    ]),

    AuthModule,

    AuditLogsModule,

    RiskSettingsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule { }

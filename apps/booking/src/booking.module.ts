import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from './booking.entity';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { Trip, TripSchema } from 'apps/trip/src/trip.entity';
import { StopDetails, StopDetailsSchema } from 'apps/trip/src/stop.entity';
import { RedisCacheModule } from 'utils/helper-modules/cache/cache.module';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { UploadModule } from 'utils/helper-modules/upload/upload.module';
import { Wallet, WalletSchema } from 'apps/payment/src/wallet/wallet.entity';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { QrModule } from 'utils/helper-modules/qr/qr.module';
import { SocketModule } from 'utils/helper-modules/socket/socket.module';
import { BookingSocketHandler } from './booking.socket.handler';
import { CouponModule } from 'apps/payment/src/coupon/coupon.module';
import { PricingRulesModule } from 'apps/payment/src/pricing-rules/pricing-rules.module';

@Module({
  imports: [
    // ─── Config ──────────────────────────────────────────────
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
      { name: Booking.name, schema: BookingSchema },
      { name: User.name, schema: UserSchema },
      { name: Trip.name, schema: TripSchema },
      { name: StopDetails.name, schema: StopDetailsSchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
    RedisCacheModule,
    AuthModule,
    UploadModule,
    SqsModule,
    QrModule,
    SocketModule,
    CouponModule,
    PricingRulesModule
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingSocketHandler],
  exports: [BookingService]
})
export class BookingModule { }

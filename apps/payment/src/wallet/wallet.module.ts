import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './wallet.entity';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { Trip, TripSchema } from 'apps/trip/src/trip.entity';
import { StopDetails, StopDetailsSchema } from 'apps/trip/src/stop.entity';
import { Booking, BookingSchema } from 'apps/booking/src/booking.entity';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { WalletHandler } from './wallet.handler';
import { RedisCacheModule } from 'utils/helper-modules/cache/cache.module';
import { PricingRules, PricingRulesSchema } from '../pricing-rules/pricing-rules.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: User.name, schema: UserSchema },
      { name: Trip.name, schema: TripSchema },
      { name: StopDetails.name, schema: StopDetailsSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: PricingRules.name, schema: PricingRulesSchema },
    ]),
    SqsModule,
    AuthModule,
    RedisCacheModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletHandler],
  exports: [WalletService],
})
export class WalletModule { }

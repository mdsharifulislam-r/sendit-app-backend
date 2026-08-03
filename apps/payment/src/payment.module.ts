import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { mongooseFactory } from 'utils/config/database';
import { WalletModule } from './wallet/wallet.module';
import { StripeService } from 'utils/helper-modules/stripe/stripe.service';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { StripeModule } from 'utils/helper-modules/stripe/stripe.module';
import { TransactionModule } from './transaction/transaction.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { CouponModule } from './coupon/coupon.module';
import { PricingRulesModule } from './pricing-rules/pricing-rules.module';
import { BookingService } from 'apps/booking/src/booking.service';
import { BookingModule } from 'apps/booking/src/booking.module';
import { HealthModule } from 'utils/health/health.module';

@Module({
  imports: [
    HealthModule,

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: mongooseFactory,
    }),

    WalletModule,
    AuthModule,
    StripeModule,
    TransactionModule,
    SqsModule,
    CouponModule,
    PricingRulesModule,
    BookingModule
  ],
  controllers: [PaymentController],
  providers: [PaymentService, StripeService],
})
export class PaymentModule { }

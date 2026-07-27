import { Module } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CouponController } from './coupon.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Coupon, CouponSchema } from './coupon.entity';
import { StripeModule } from 'utils/helper-modules/stripe/stripe.module';
import { CouponUsage, CouponUsageSchema } from './coupon.entity';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Coupon.name, schema: CouponSchema },
    { name: CouponUsage.name, schema: CouponUsageSchema }
    ]),
    StripeModule,
    AuthModule,
    SqsModule
  ],
  controllers: [CouponController],
  providers: [CouponService],
  exports: [CouponService]
})
export class CouponModule { }

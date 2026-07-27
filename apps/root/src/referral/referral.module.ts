import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralController } from './referral.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Referral, ReferralSchema } from './referral.entity';
import { Coupon, CouponSchema } from 'apps/payment/src/coupon/coupon.entity';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Referral.name, schema: ReferralSchema },
      { name: Coupon.name, schema: CouponSchema }
    ]),

    SqsModule,

  ],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService]
})
export class ReferralModule { }

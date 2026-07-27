import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Referral } from './referral.entity';
import { Model } from 'mongoose';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import { Coupon } from 'apps/payment/src/coupon/coupon.entity';

@Injectable()
export class ReferralService {
    constructor(
        @InjectModel(Referral.name) private readonly referralModel: Model<Referral>,
        @InjectModel(Coupon.name) private readonly couponModel: Model<Coupon>,
    ) { }

    @SqsConsumer('referral.create')
    async createReferral(referral: Referral): Promise<Referral> {

        const discount = await this.couponModel.findOne({
            type: "Referral"
        }).select("_id")

        referral.discount = discount?._id!

        return await this.referralModel.create(referral);
    }

    async checkReferral(refferar: string, referee: string, checkedFor: string) {
        const existReferral = await this.referralModel.findOne({
            $or: [
                { referee: referee },
                { refferar: refferar }
            ]
        }).populate("discount")

        if (!existReferral) return null

        const isRefferer = checkedFor == existReferral.referrar.toString()
        const isReffree = checkedFor == existReferral.refrree.toString()

        if (!isRefferer && !isReffree) return null

        const discount = existReferral?.discount as any as Coupon
        return {
            isExist: true,
            isRefferer: isRefferer,
            isReffree: isReffree,
            discount_amount: isRefferer ? discount.refferar_amount : discount.reffree_amount,

        }

    }

}

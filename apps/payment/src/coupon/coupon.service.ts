import { Injectable } from '@nestjs/common';
import { CreateCouponDto, UpdateCouponDto } from './coupon.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Coupon, CouponUsage } from './coupon.entity';
import { Model, Types } from 'mongoose';
import { StripeService } from 'utils/helper-modules/stripe/stripe.service';
import sendResponse from 'utils/helper/sendResponse';
import { ApiError } from 'utils/errors/api-error';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateAuditLogsDto } from 'apps/admin/src/audit-logs/audit-logs.dto';

@Injectable()
export class CouponService {
    constructor(
        @InjectModel(Coupon.name) private readonly couponModel: Model<Coupon>,
        @InjectModel(CouponUsage.name) private readonly couponUsageModel: Model<CouponUsage>,
        private readonly stripeServie: StripeService,
        private readonly snsService: SnsService
    ) { }

    async createCoupon(data: CreateCouponDto, userId: string) {
        const stripeCoupon = await this.stripeServie.getClient().coupons.create({
            name: data.code,
            duration: "once",
            max_redemptions: data.max_usage,
            ...(data.discount_percentage && { percent_off: data.discount_percentage }),
            ...(data.discount_amount && { amount_off: data.discount_amount }),
        })

        const coupon = await this.couponModel.create({
            ...data,
            stripe_coupon_code: stripeCoupon.id,
        })
        this.snsService.publish<CreateAuditLogsDto>("audit.create", {
            action: "Coupon created",
            user: userId as any,
            old_value: '',
            new_value: '',
            reason: "Coupon created"
        })
        return sendResponse({
            message: 'Coupon created successfully',
            success: true,
            statusCode: 200,
            data: coupon
        })
    }

    async updateCoupon(id: string, data: UpdateCouponDto, userId: string) {
        const stripeCoupon = await this.stripeServie.getClient().coupons.create({
            name: data.code,
            duration: "once",
            max_redemptions: data.max_usage,
            ...(data.discount_percentage && { percent_off: data.discount_percentage }),
            ...(data.discount_amount && { amount_off: data.discount_amount }),
        })

        const coupon = await this.couponModel.findByIdAndUpdate(id, {
            ...data,
            stripe_coupon_code: stripeCoupon.id,
        })
        this.snsService.publish<CreateAuditLogsDto>("audit.create", {
            action: "Coupon updated",
            user: userId as any,
            old_value: '',
            new_value: '',
            reason: "Coupon updated"
        })
        return sendResponse({
            message: 'Coupon updated successfully',
            success: true,
            statusCode: 200,
            data: coupon
        })
    }

    async deleteCoupon(id: string, userId: string) {
        const coupon = await this.couponModel.findById(id)
        if (!coupon) {
            throw new ApiError(404, "Coupon not found")
        }
        await this.stripeServie.getClient().coupons.del(coupon.stripe_coupon_code)
        await this.couponModel.deleteOne({ _id: id })
        this.snsService.publish<CreateAuditLogsDto>("audit.create", {
            action: "Coupon deleted",
            user: userId as any,
            old_value: '',
            new_value: '',
            reason: "Coupon deleted"
        })
        return sendResponse({
            message: 'Coupon deleted successfully',
            success: true,
            statusCode: 200,
            data: coupon
        })
    }

    async getAllCoupons(query: Record<string, any>) {
        const couponQuery = new QueryBuilder(this.couponModel.find(), query).search(['name', 'code']).paginate()

        const [coupons, pagination] = await Promise.all([
            couponQuery.modelQuery.lean(),
            couponQuery.getPaginationInfo()
        ])
        return sendResponse({
            message: 'Coupons fetched successfully',
            success: true,
            statusCode: 200,
            data: coupons,
            pagination
        })
    }

    async checkIsAvailable(code: string, userId: Types.ObjectId, amount?: number) {
        const coupon = await this.couponModel.findOne({ code })
        if (!coupon) {
            throw new ApiError(404, "Coupon not found")
        }
        if (new Date() > coupon.expiry_date) {
            throw new ApiError(400, "Coupon is expired")
        }
        if (coupon.used_count >= coupon.max_usage) {
            throw new ApiError(400, "Coupon is used up")
        }
        const couponUsage = await this.couponUsageModel.findOne({ coupon: coupon._id, user: userId })
        if (couponUsage) {
            throw new ApiError(400, "Coupon is already used by you")
        }

        if (amount) {
            if (coupon.discount_amount) {
                if (amount < coupon.discount_amount) {
                    throw new ApiError(400, "Amount is less than coupon discount amount")
                }

                const discountAmount = amount - coupon.discount_amount;

                return {
                    amount,
                    discountAmount: coupon.discount_amount,
                    discount_amount: discountAmount,
                    discount_type: coupon.coupon_type,
                    final_amount: amount - coupon.discount_amount,
                    stripe_coupon_code: coupon.stripe_coupon_code
                }
            }
            if (coupon.discount_percentage) {
                if (amount < coupon.discount_percentage * amount / 100) {
                    throw new ApiError(400, "Amount is less than coupon discount percentage")
                }

                const discountAmount = coupon.discount_percentage * amount / 100;

                return {
                    amount,
                    discountAmount: coupon.discount_percentage,
                    discount_amount: discountAmount,
                    discount_type: coupon.coupon_type,
                    final_amount: amount - discountAmount,
                    stripe_coupon_code: coupon.stripe_coupon_code
                }
            }
        }

        return {
            discountAmount: 0,
            discount_amount: coupon.discount_amount || coupon.discount_percentage,
            discount_type: coupon.coupon_type,
            final_amount: 0
        }
    }


    @SqsConsumer('coupon.used')
    async addCouponUses({ code, userId }: { code: string, userId: Types.ObjectId }) {
        console.log("coupon.used", code, userId)
        const coupon = await this.couponModel.findOne({ code })

        await this.couponModel.updateOne({ code }, { $inc: { used_count: 1 } })
        await this.couponUsageModel.create({ code, user: userId, coupon: coupon?._id })
        return sendResponse({
            message: 'Coupon used successfully',
            success: true,
            statusCode: 200,
        })
    }
}

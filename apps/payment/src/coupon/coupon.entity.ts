import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types, Schema as MongooseSchema } from "mongoose";

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true, collection: 'coupons' })
export class Coupon {
    @Prop({ required: true })
    code: string

    @Prop({ required: true })
    name: string

    @Prop({ required: false })
    stripe_coupon_code: string

    @Prop({ required: false, enum: ["fixed", "percentage"], default: "fixed" })
    coupon_type: "fixed" | "percentage"

    @Prop({ required: false, default: 0 })
    discount_percentage: number

    @Prop({ required: false, default: 0 })
    discount_amount: number

    @Prop({ required: true })
    expiry_date: Date

    @Prop({ required: true, default: 0 })
    max_usage: number

    @Prop({ required: false, default: 0 })
    used_count: number

}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
CouponSchema.index({ code: 1 }, { unique: true })



@Schema({ timestamps: true, collection: 'coupon_usage' })
export class CouponUsage {
    @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
    user: Types.ObjectId

    @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Coupon' })
    coupon: Types.ObjectId
}

export type CouponUsageDocument = CouponUsage & Document;
export const CouponUsageSchema = SchemaFactory.createForClass(CouponUsage);
CouponUsageSchema.index({ user: 1, coupon: 1 }, { unique: true })
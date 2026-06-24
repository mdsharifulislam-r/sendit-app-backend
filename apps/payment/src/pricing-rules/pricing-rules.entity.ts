import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'pricing_rules' })
export class PricingRules extends Document {
    @Prop({ required: true })
    platform_fee: number

    @Prop({ required: true })
    tax_amount: number

    @Prop({ required: true })
    withdraw_fee: number

    @Prop({ required: true })
    min_withdraw_amount: number


}

export const PricingRulesSchema = SchemaFactory.createForClass(PricingRules);

import { Document, Schema as MongooseSchema, Types } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { RISK_ITEM_TYPE, RISKY_ITEM_STATUS } from "./risk-settings.dto";

@Schema({ timestamps: true, collection: "riskSettings" })
export class RiskSettings {
    @Prop({ required: true, type: Number })
    high_value_threshold: number
    @Prop({ required: true, type: Number })
    max_failed_kyc_attempts: number
    @Prop({ required: true, type: Number })
    auto_flag_weight_threshold: number
    @Prop({ required: true, type: Number })
    rapid_transaction_window_hours: number
}
export type RiskSettingsDocument = RiskSettings & Document
export const RiskSettingsSchema = SchemaFactory.createForClass(RiskSettings)



@Schema({ timestamps: true, collection: "riskyItems" })
export class RiskyItems {
    @Prop({ required: true, type: String, enum: RISK_ITEM_TYPE })
    type: RISK_ITEM_TYPE
    @Prop({ required: true, type: String })
    description: string
    @Prop({ required: true, type: MongooseSchema.Types.ObjectId, refPath: 'type' })
    item: Types.ObjectId
    @Prop({ required: true, type: String, enum: RISKY_ITEM_STATUS, default: RISKY_ITEM_STATUS.PENDNIG })
    status: RISKY_ITEM_STATUS
}
export type RiskyItemsDocument = RiskyItems & Document
export const RiskyItemsSchema = SchemaFactory.createForClass(RiskyItems)
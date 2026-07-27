import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document, Types, Schema as MongooseSchema } from "mongoose"

@Schema({ timestamps: true, collection: 'referral' })
export class Referral extends Document {
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: "User",
    })
    referrar: Types.ObjectId

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: "User",
    })
    refrree: Types.ObjectId

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: "Discount",
    })
    discount: Types.ObjectId
}


export const ReferralSchema = SchemaFactory.createForClass(Referral)
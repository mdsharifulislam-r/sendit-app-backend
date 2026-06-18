import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { AGREEMENT_VALIDITY, SIGNATURE_TYPE } from "./transport-agreement.dto";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

@Schema({
    timestamps: true,
    collection: 'transport_agreement'
})
export class TransportAgreement {
    @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
    user: Types.ObjectId

    @Prop({ required: true, enum: AGREEMENT_VALIDITY })
    validity: AGREEMENT_VALIDITY

    @Prop({ type: Date, default: null })
    valid_from: Date

    @Prop({ type: Date, default: null })
    valid_until: Date

    @Prop({ required: true, enum: SIGNATURE_TYPE })
    signature_type: SIGNATURE_TYPE

    @Prop({ required: false })
    signature: string

    @Prop({ required: false })
    singnature_image: string
}

export const TransportAgreementSchema = SchemaFactory.createForClass(TransportAgreement)

TransportAgreementSchema.pre('save', function (next) {
    if (this.validity) {
        if (this.validity === AGREEMENT_VALIDITY.VALID_FOR_ONE_TRIP) {
            this.valid_from = new Date();
            // 10 minutes later
            this.valid_until = new Date(new Date().getTime() + 1 * 60 * 1000);
        } else if (this.validity === AGREEMENT_VALIDITY.VALID_FOR_6_MONTHS) {
            this.valid_from = new Date();
            this.valid_until = new Date(new Date().setMonth(new Date().getMonth() + 6));
        } else if (this.validity === AGREEMENT_VALIDITY.VALID_FOR_1_YEAR) {
            this.valid_from = new Date();
            this.valid_until = new Date(new Date().setFullYear(new Date().getFullYear() + 1));
        }
    }
    next()
})
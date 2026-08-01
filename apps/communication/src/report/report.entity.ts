import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

@Schema({ timestamps: true, collection: 'report' })
export class Report {
    @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
    user: Types.ObjectId
    @Prop({ required: false, type: String })
    report_id: string
    @Prop({ required: true, type: String })
    report_type: string
    @Prop({ required: true, type: String })
    description: string
    @Prop({ required: false, type: [String] })
    attachments: string[]
    @Prop({ required: false, type: String, enum: ['open', 'closed', 'resolved'], default: 'open' })
    status: "open" | "closed"

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trip' })
    trip: Types.ObjectId

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking' })
    booking: Types.ObjectId

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    transporter: Types.ObjectId

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    receiver: Types.ObjectId

    @Prop({ type: Boolean, default: false })
    is_refunded: boolean

    @Prop({ type: Number, default: 0 })
    refunded_amount: number

    @Prop({ type: String, default: '' })
    refund_reason: string

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Chat' })
    chat: Types.ObjectId
}

export type ReportDocument = Report & Document

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.pre('save', function (next) {
    this.report_id = `Report-${Math.floor(1000 + Math.random() * 9000)}`
    next()
})
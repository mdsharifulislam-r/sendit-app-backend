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
    @Prop({ required: false, type: String, enum: ['open', 'closed'], default: 'open' })
    status: "open" | "closed"
}

export type ReportDocument = Report & Document

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.pre('save', function (next) {
    this.report_id = `Report-${Math.floor(1000 + Math.random() * 9000)}`
    next()
})
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types, Schema as MongooseSchema } from "mongoose";

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: { createdAt: 'createdAt' }, collection: 'audit_logs' })
export class AuditLog {
    @Prop({ required: true })
    action: string;
    @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
    user: Types.ObjectId;
    @Prop({ type: String, default: null })
    old_value: string;
    @Prop({ type: String, default: null })
    new_value: string;
    @Prop({ type: String, default: null })
    reason: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
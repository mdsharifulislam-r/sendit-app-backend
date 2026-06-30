import { Types, Document, Schema as MongooseSchema } from "mongoose";
import { Prop, raw, SchemaFactory, Schema } from "@nestjs/mongoose";

export type DeviceDocument = Device & Document

@Schema({ timestamps: true, collection: 'devices' })
export class Device {
    @Prop({ type: String, required: true })
    device_id: string

    @Prop({ type: String, required: true })
    device_name: string

    @Prop({ type: String, required: true })
    address: string

    @Prop({ type: String, enum: ['active', 'inactive', 'deleted', 'blocked'], default: 'active' })
    status: "active" | "inactive" | "deleted" | "blocked"

    @Prop(raw({
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
    }))
    location: { type: string; coordinates: number[] };

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId
}

export const DeviceSchema = SchemaFactory.createForClass(Device)

DeviceSchema.index({ location: '2dsphere' });
DeviceSchema.index({ device_id: 1, user: 1 })
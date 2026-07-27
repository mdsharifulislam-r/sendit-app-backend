import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types, Schema as MongooseSchema } from "mongoose";

export type AddressDocument = Address & Document;

@Schema({ timestamps: true, collection: "addresses" })
export class Address {
    @Prop({ type: String })
    type: string

    @Prop({ type: String })
    address: string

    @Prop({
        type: new MongooseSchema(
            {
                type: { type: String, default: "Point" },
                coordinates: { type: [Number], default: [0, 0] },
            },
            { _id: false },
        ),
    })
    location: { type: string; coordinates: number[] };

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User" })
    user: Types.ObjectId
}

export const AddressSchema = SchemaFactory.createForClass(Address)

AddressSchema.index({ location: "2dsphere" })

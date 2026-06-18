import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types, Schema as MongooseSchema } from "mongoose";
import { ReviewType } from "./review.dto";

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: false })
    booking_id?: Types.ObjectId;

    @Prop({ type: Number, required: true })
    rating: number;

    @Prop({ type: String, required: true })
    comment: string;

    @Prop({ type: String, required: true, enum: ReviewType })
    type: ReviewType;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    transporter: Types.ObjectId;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
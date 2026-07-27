import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types, Schema as MongooseSchema } from "mongoose";
import { ReviewType } from "./review.dto";

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: false })
    booking?: Types.ObjectId;

    @Prop({ type: Number, required: true })
    rating: number;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trip', required: false })
    trip?: Types.ObjectId;

    @Prop({ type: String, required: true })
    comment: string;

    @Prop({ type: String, required: true, enum: ReviewType })
    type: ReviewType;

    @Prop({ type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' })
    status: 'pending' | 'approved' | 'rejected'

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    transporter: Types.ObjectId;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.pre('save', function (next) {
    if (this.type == ReviewType.BOOKING) {
        this.status = 'approved'
    }
    next()
})
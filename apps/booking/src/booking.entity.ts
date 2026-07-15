import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { BOOKING_PREFFERENCE, BOOKING_STATUS, DELIVERY_SPEED, PACKAGE_SIZE, PACKAGE_TYPE, TIMELINE_TYPE } from './booking.dto';

export type BookingDocument = Booking & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'bookings' })
export class Booking {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ type: String, enum: PACKAGE_SIZE, required: true })
  package_size: PACKAGE_SIZE;

  @Prop({ required: true })
  weight: number;

  @Prop({ required: true })
  package_content: string;

  @Prop({ type: String, enum: PACKAGE_TYPE, required: true })
  package_type: PACKAGE_TYPE;

  @Prop({ type: [String], required: true })
  exterior_images: string[];

  @Prop({ type: [String], required: true })
  interior_images: string[];

  @Prop({ type: Boolean, default: false })
  need_to_storage_untill_pickup: boolean;

  @Prop({ type: Date, default: null })
  storage_start_date?: Date;

  @Prop({ type: Date, default: null })
  storage_end_date?: Date;

  @Prop({
    type: new MongooseSchema(
      { name: { type: String, required: true }, phone: { type: String, required: true } },
      { _id: false },
    ),
    required: true,
  })
  sender_information: { name: string; phone: string };

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  sender: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  receiver: Types.ObjectId;

  @Prop({
    type: new MongooseSchema(
      { name: { type: String, required: true }, phone: { type: String, required: true } },
      { _id: false },
    ),
    required: true,
  })
  receiver_information: { name: string; phone: string };

  @Prop({ required: true })
  pickup_address: string;

  @Prop({ required: true })
  dropoff_address: string;

  @Prop({
    type: new MongooseSchema(
      {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
      { _id: false },
    ),
    required: true,
  })
  pickup_location: { type: string; coordinates: number[] };

  @Prop({
    type: new MongooseSchema(
      {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
      { _id: false },
    ),
    required: true,
  })
  dropoff_location: { type: string; coordinates: number[] };

  @Prop({ type: String, enum: BOOKING_STATUS, default: BOOKING_STATUS.PENDING })
  status: BOOKING_STATUS;

  @Prop({ type: String, enum: DELIVERY_SPEED, default: DELIVERY_SPEED.NORMAL })
  delivery_speed: DELIVERY_SPEED;

  @Prop({ type: String, enum: BOOKING_PREFFERENCE, default: BOOKING_PREFFERENCE.DROP_POINT })
  booking_preffernce: BOOKING_PREFFERENCE;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trip' })
  trip: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  transporter: Types.ObjectId;

  @Prop({
    type: {
      subtotal: Number,
      service_charge: Number,
      discount: Number,
      tax: Number,
      total: Number,
    },
    required: true,
  })
  price_breakdown: {
    subtotal: number;
    service_charge: number;
    discount: number;
    tax: number;
    total: number;
  };

  @Prop({ type: String })
  coupon: string

  @Prop({
    type: [Object],
    default: [],
  })
  timeline: { date: Date; status: TIMELINE_TYPE }[];

  @Prop({ type: String, default: '' })
  qr_code: string;

  @Prop({ type: String, default: '' })
  rejection_reason: string;

  @Prop({ type: String, default: '' })
  cancellation_reason: string;

  @Prop({ type: String, enum: TIMELINE_TYPE })
  current_stage: TIMELINE_TYPE

  @Prop({ type: Object, default: {} })
  pickup_condition: { proof_image: string, package_condition: string, damage_image: string, note: string }

  @Prop({ type: Object, default: {} })
  dropoff_condition: { proof_image: string, package_condition: string, damage_image: string, note: string }

  @Prop({ type: Date, default: null })
  pickup_date: Date

  @Prop({ type: String, default: null })
  pickup_method: string

}

export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.pre('save', function (next: any) {
  if (!this.id) {
    this.id = `SNDB-BK-${Math.random().toString(36).substr(2, 9)}`;
  }
  if (!this.timeline || !this.timeline.length) {
    this.timeline = [{ date: new Date(), status: TIMELINE_TYPE.BOOKED }];
  }
  next();
});

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { CARRY_TYPE, TRANSPORT_TYPE, TRIP_STATUS } from './trip.dto';

export type TripDocument = Trip & Document;

class PricingDetails {
  currency: string;
  price_per_document: number;
  price_per_kg: number;
}

class VehicleDetails {
  type: string;
  number: string;
  name: string;
  ticket: string;
}

class TripRules {
  title: string;
  content: string;
}

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'trips' })
export class Trip {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  departure_address: string;

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
  departure_location: { type: string; coordinates: number[] };

  @Prop({ required: true })
  departure_date: Date;

  @Prop({ type: Date, default: null })
  return_date: Date;

  @Prop({ type: String, default: null })
  return_address: string;

  @Prop({
    type: new MongooseSchema(
      {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] },
      },
      { _id: false },
    ),
    default: null,
  })
  return_location: { type: string; coordinates: number[] };

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'StopDetails' }], default: [] })
  stops: Types.ObjectId[];

  @Prop({ type: String, enum: CARRY_TYPE, default: null })
  carry_type: CARRY_TYPE;

  @Prop({
    type: {
      currency: { type: String, default: null },
      price_per_document: { type: Number, default: null },
      price_per_kg: { type: Number, default: null },
    },
    default: {},
  })
  pricing_details: PricingDetails;

  @Prop({ type: Number, default: null })
  available_space_kg: number;

  @Prop({ type: String, enum: TRIP_STATUS, default: TRIP_STATUS.PUBLISHED })
  status: TRIP_STATUS;

  @Prop({ type: String, enum: TRANSPORT_TYPE, default: null })
  transport_type: TRANSPORT_TYPE;

  @Prop({
    type: new MongooseSchema(
      {
        type: { type: String, default: null },
        number: { type: String, default: null },
        name: { type: String, default: null },
        ticket: { type: String, default: null },
      },
      { _id: false },
    ),
    default: {},
  })
  vehicle_details: VehicleDetails;

  @Prop({ type: [{ title: String, content: String }], default: null })
  trip_rules: TripRules[];

  @Prop({ type: String, default: null })
  trip_description: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, default: null })
  cancellation_reason: string;

  @Prop({ type: String, default: null })
  what_we_accept: string;

  @Prop({ type: Number, default: 0 })
  exist_weight: number;

  @Prop({ type: Number, default: 0 })
  total_bookings: number;

  @Prop({ type: Number, default: 0 })
  total_reviews: number;

  @Prop({ type: Number, default: 0 })
  avg_rating: number;
}

export const TripSchema = SchemaFactory.createForClass(Trip);

TripSchema.index({ departure_location: '2dsphere' });
TripSchema.index({ return_location: '2dsphere' });

TripSchema.pre('save', function (next: any) {
  if (!this.id) {
    this.id = `trip-${Math.random().toString(36).substr(2, 9)}`;
  }
  this.exist_weight = this.available_space_kg;
  next();
});

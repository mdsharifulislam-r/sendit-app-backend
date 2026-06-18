import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type StopDetailsDocument = StopDetails & Document;

@Schema({ collection: 'stop_details' })
export class StopDetails {
  _id: Types.ObjectId;

  @Prop({ required: true })
  id: string;

  @Prop({ type: String, default: null })
  address: string;

  @Prop({
    type: new MongooseSchema(
      {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
      { _id: false },
    ),
    default: null,
  })
  location: { type: string; coordinates: number[] };

  @Prop({ type: Date, default: null })
  date: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trip' })
  trip: Types.ObjectId;
}

export const StopDetailsSchema = SchemaFactory.createForClass(StopDetails);

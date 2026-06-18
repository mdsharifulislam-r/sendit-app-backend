import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DISCLAIMER_TYPE } from './disclaimer.dto';

export type DisclaimerDocument = Disclaimer & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'disclaimer' })
export class Disclaimer {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ type: String, enum: DISCLAIMER_TYPE, required: true })
  type: DISCLAIMER_TYPE;

  @Prop({ required: true })
  content: string;
}

export const DisclaimerSchema = SchemaFactory.createForClass(Disclaimer);

DisclaimerSchema.pre('save', function (next: any) {
  if (!this.id) {
    this.id = `DIS-${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

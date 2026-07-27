import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DISCLAIMER_TYPE } from './disclaimer.dto';

export type DisclaimerDocument = Disclaimer & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'disclaimer' })
export class Disclaimer {
  @Prop({ type: String, enum: DISCLAIMER_TYPE, required: true })
  type: DISCLAIMER_TYPE;

  @Prop({ required: true })
  content: string;
}

export const DisclaimerSchema = SchemaFactory.createForClass(Disclaimer);

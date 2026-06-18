import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FilePathType } from './communication.dto';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'notifications' })
export class Notification {
  _id: Types.ObjectId;

  @Prop({ type: [String], default: null })
  receiver: string[];

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: [String], default: null })
  readers: string[];

  @Prop({ type: String, enum: FilePathType, default: null })
  filePath: FilePathType;

  @Prop({ type: String, default: null })
  referenceId: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

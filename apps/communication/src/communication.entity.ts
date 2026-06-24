import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { FilePathType } from './communication.dto';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'notifications' })
export class Notification {
  _id: Types.ObjectId;

  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [], ref: "User" })
  receiver: Types.ObjectId[];

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [], ref: "User" })
  readers: Types.ObjectId[];

  @Prop({ type: String, enum: FilePathType, default: null })
  filePath: FilePathType;

  @Prop({ type: String, default: null })
  referenceId: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

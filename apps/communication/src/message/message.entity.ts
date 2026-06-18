import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";
import { MESSAGE_TYPE } from "./message.dto";
@Schema({ timestamps: true, collection: 'message' })
export class Message {
    @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
    sender: Types.ObjectId
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    receiver: Types.ObjectId
    @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Chat', index: true })
    chat: Types.ObjectId
    @Prop({ required: false, type: String })
    message: string
    @Prop({ required: false, type: String, enum: MESSAGE_TYPE })
    type: MESSAGE_TYPE
    @Prop({ required: false, type: [String] })
    images: string[]
    @Prop({ required: false, type: [String] })
    documents: string[]

    @Prop({ required: false, type: [MongooseSchema.Types.ObjectId], ref: 'User' })
    readBy: Types.ObjectId[]

}

export type MessageDocument = Message & Document

export const MessageSchema = SchemaFactory.createForClass(Message);

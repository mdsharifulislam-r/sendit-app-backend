import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types, Schema as MongooseSchema } from "mongoose";
import { CHAT_STATUS, CHAT_TYPE } from "./chat.dto";

export type ChatDocument = Chat & Document;

@Schema({ timestamps: true, collection: 'chats' })
export class Chat {

    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], required: true })
    participants: Types.ObjectId[]

    @Prop({ type: String, default: 'active' })
    status: CHAT_STATUS

    @Prop({ type: Boolean, default: false })
    isMute: boolean

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trip', default: null })
    trip: Types.ObjectId

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', default: null })
    booking: Types.ObjectId

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
    sender: Types.ObjectId

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
    transporter: Types.ObjectId

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
    receiver: Types.ObjectId

    @Prop({ type: String, enum: CHAT_TYPE, default: CHAT_TYPE.SINGLE })
    type: CHAT_TYPE

    @Prop({ type: Boolean, default: false })
    is_support_message: boolean

    @Prop({ type: String, default: null })
    name: string

    @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', default: [] })
    delete_from: Types.ObjectId[]

    @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', default: [] })
    archive_from: Types.ObjectId[]

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', default: null })
    lastMessage: Types.ObjectId

    @Prop({ type: String, default: null })
    description: string

}


export const ChatSchema = SchemaFactory.createForClass(Chat);


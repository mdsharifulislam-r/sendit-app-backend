import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './message.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from './message.entity';
import { Model, Types } from 'mongoose';
import { Chat } from '../chat/chat.entity';
import { ApiError } from 'utils/errors/api-error';
import { CHAT_STATUS } from '../chat/chat.dto';
import { SocketService } from 'utils/helper-modules/socket/socket.service';
import sendResponse from 'utils/helper/sendResponse';
import { S3Service } from 'utils/helper-modules/upload/s3.service';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';


@Injectable()
export class MessageService {
    constructor(
        @InjectModel(Message.name) private messageModel: Model<Message>,
        @InjectModel(Chat.name) private chatModel: Model<Chat>,
        private readonly socketService: SocketService,
        private readonly s3Service: S3Service
    ) { }

    async sendMessage(payload: CreateMessageDto) {
        const chat = await this.chatModel.findById(payload.chat).lean()
        if (!chat) {
            throw new ApiError(404, "chat not found")
        }

        if (chat.status == CHAT_STATUS.BLOCK) {
            throw new ApiError(403, "you can't message on this chat")
        }


        if (payload.images) {
            if (!payload.images?.some((img) => {
                return img.includes('https')
            })) {
                payload.images = await this.s3Service.uploadMultipleFiles(payload.images)

            }
        }

        if (payload.documents) {
            payload.documents = await this.s3Service.uploadMultipleFiles(payload.documents)
        }


        const message = await this.messageModel.create({
            ...payload
        })


        this.socketService.emit(`get-message::${payload.chat}`, message)

        await this.chatModel.findByIdAndUpdate(payload.chat, {
            lastMessage: message._id
        })

        chat.participants.forEach(async (participant) => {
            this.socketService.emit(`chat-update::${participant}`, message)
        })


        return sendResponse({
            statusCode: 200,
            success: true,
            message: 'message sent successfully',
            data: { message }
        })

    }


    async getMessageByChat(chatId: string, query: Record<string, any>, userId: string) {
        const chat = await this.chatModel.findById(chatId)
        if (!chat) {
            throw new ApiError(404, "chat not found")
        }
        // if (chat.participants.filter((participant) => participant.toString() == userId).length == 0) {
        //     throw new ApiError(403, "you can't access this chat")
        // }

        await this.messageModel.updateMany(
            { chat: chatId, sender: { $ne: new Types.ObjectId(userId) }, readBy: { $nin: [userId] } },
            { $addToSet: { readBy: userId } }
        )

        const messageQuery = new QueryBuilder(
            this.messageModel.find({ chat: chatId }),
            query
        ).filter([])
            .sort()
            .paginate()


        let [messages, pagination] = await Promise.all([
            messageQuery.modelQuery.populate([
                {
                    path: 'sender',
                    select: 'name email image'
                }
            ]).lean(),
            messageQuery.getPaginationInfo()
        ])

        messages = messages.map((message: any) => {
            return {
                ...message,
                isRead: message?.readBy?.some((readBy: Types.ObjectId) => readBy.toString() === userId)
            }
        })
        return sendResponse({
            message: 'messages fetched successfully',
            success: true,
            statusCode: 200,
            data: messages,
            pagination
        })
    }
}

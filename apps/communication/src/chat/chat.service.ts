import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Chat } from './chat.entity';
import { Model, Types } from 'mongoose';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import sendResponse from 'utils/helper/sendResponse';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { User } from 'apps/root/src/user/user.entity';
import { ApiError } from 'utils/errors/api-error';
import { CHAT_STATUS } from './chat.dto';
import { CreateReportDto } from '../report/report.dto';
import { Report } from '../report/report.entity';
import { MessageService } from '../message/message.service';
import { MESSAGE_TYPE } from '../message/message.dto';

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(Chat.name) private chatModel: Model<Chat>,
        @InjectModel(Report.name) private reportModel: Model<Report>,
        private readonly messageService: MessageService
    ) { }

    @SqsConsumer('chat.create')
    async createChat(chat: Chat, userId: string) {
        chat.participants.push(userId as any)
        chat.participants = chat.participants.map((participant: any) => {
            if (typeof participant === 'string') {
                return new Types.ObjectId(participant)
            }
            return participant
        })

        const exists = await this.chatModel.findOne({ participants: { $all: chat.participants } })
        if (exists) {
            return sendResponse({
                message: 'Chat already exists',
                success: true,
                statusCode: 200,
                data: exists
            })
        }
        const data = await this.chatModel.create(chat);
        return sendResponse({
            message: 'Chat created successfully',
            success: true,
            statusCode: 200,
            data
        })
    }

    async getChat(chatId: string) {
        return this.chatModel.findById(chatId).populate('participants');
    }

    async getChats(userId: string, query: any) {
        console.log(query);

        const initQuery = query?.arcived != 'true' ? { participants: { $in: [new Types.ObjectId(userId)] }, delete_from: { $nin: [userId] }, archive_from: { $nin: [userId] } } : { archive_from: { $in: [userId] }, delete_from: { $nin: [userId] } }
        const chatQuery = new QueryBuilder(
            this.chatModel.find(initQuery),
            query
        ).paginate().filter(['arcived'])

        const [chats, pagination] = await Promise.all([
            chatQuery.modelQuery.populate([
                {
                    path: 'participants',
                    select: 'name email image',
                    match: { _id: { $ne: new Types.ObjectId(userId) } }
                },
                {
                    path: 'lastMessage',
                    select: 'message type images documents createdAt'
                }
            ]).sort({ updatedAt: -1 }).lean(),
            chatQuery.getPaginationInfo()
        ])



        return sendResponse({
            message: 'Chats fetched successfully',
            success: true,
            statusCode: 200,
            data: chats,
            pagination
        })

    }

    async deleteChat(chatId: string, userId: string) {
        const data = await this.chatModel.findById(chatId);
        if (!data) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Chat not found')
        }
        await this.chatModel.findOneAndUpdate({ _id: chatId }, { $push: { delete_from: userId } })
        return sendResponse({
            message: 'Chat deleted successfully',
            success: true,
            statusCode: 200,
            data
        })
    }

    async archiveChat(chatId: string, user: string) {
        const data = await this.chatModel.findById(chatId);
        if (!data) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Chat not found')
        }
        await this.chatModel.findOneAndUpdate({ _id: chatId }, { $addToSet: { archive_from: user } })
        return sendResponse({
            message: 'Chat archived successfully',
            success: true,
            statusCode: 200,
            data
        })
    }

    @SqsConsumer('chat.report.create')
    async createReportChat(payload: Report) {
        try {
            console.log(payload);
            const exsistSupportChat = await this.chatModel.findOne({ participants: { $in: [payload.user] }, is_support_message: true })

            if (exsistSupportChat) {
                const report = await this.reportModel.findOneAndUpdate({ report_id: payload.report_id }, { chat: exsistSupportChat._id })
                this.messageService.sendMessage({
                    chat: exsistSupportChat._id,
                    message: payload.description,
                    sender: payload.user,
                    type: MESSAGE_TYPE.TEXT,
                    images: payload.attachments,
                    receiver: null as any,
                    report: report?._id!
                })
                return
            }
            const data = await this.chatModel.create({
                participants: [payload.user],
                is_support_message: true
            })
            const report = await this.reportModel.findOneAndUpdate({ report_id: payload.report_id }, { chat: data._id })

            this.messageService.sendMessage({
                chat: data._id,
                message: payload.description,
                sender: payload.user,
                type: MESSAGE_TYPE.TEXT,
                images: payload.attachments,
                receiver: null as any,
            })
        } catch (error) {
            console.log(error)
        }
    }

}


import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ISendEmail } from 'utils/helper-modules/email/email.interface';
import { EmailService } from 'utils/helper-modules/email/email.service';
import { Notification, NotificationDocument } from './communication.entity';
import { Model } from 'mongoose';
import { CreateNotificationDto } from './communication.dto';
import { SocketService } from 'utils/helper-modules/socket/socket.service';
import { User, UserDocument } from 'apps/root/src/user/user.entity';
import { USER_ROLES } from 'utils/enums/user';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import sendResponse from 'utils/helper/sendResponse';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';

@Injectable()
export class CommunicationService {
  constructor(
    private readonly emailService: EmailService,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private readonly socketService: SocketService,
    private readonly cacheService: CacheService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  @SqsConsumer('email.send')
  async handleSendEmail(payload: ISendEmail) {
    await this.emailService.sendEmail(payload);
  }

  @SqsConsumer('notification.send')
  async sendNotification(payload: CreateNotificationDto) {
    try {
      if (!payload.receiver?.length) {
        const adminUsers = await this.userModel.find({
          role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
        }).select('_id');
        payload.receiver = adminUsers.map((item) => item._id.toString());
      }
      const notification = new this.notificationModel(payload);
      const data = await notification.save();
      for (const userId of payload?.receiver || []) {
        await this.cacheService.deleteByPattern(`notification:${userId}`)
        this.socketService.emit(`notification::${userId}`, data);
      }
      return data;
    } catch (error) {
      console.log(error);
      return {
        message: 'Failed to send notification',
        error: error.message,
      };
    }
  }

  async getAllNotifications(userId: string, query: Record<string, any>) {
    const cache = await this.cacheService.get(`notification:${userId}`, query)
    if (cache) {
      return cache
    }
    const unreadCount = await this.notificationModel.countDocuments({ receiver: { $in: [userId] }, readers: { $nin: [userId] } })
    const notificationQuery = new QueryBuilder(this.notificationModel.find({ receiver: { $in: [userId] } }), query).paginate().sort()
    let [notifications, pagination] = await Promise.all([
      notificationQuery.modelQuery.lean(),
      notificationQuery.getPaginationInfo()
    ])
    notifications = notifications.map((item: any) => {
      return {
        ...item,
        isRead: item.readers.some((reader: any) => reader.toString() === userId),
      }
    })
    await this.cacheService.set(`notification:${userId}`, { data: { notifications, unreadCount }, pagination }, 3600, query)

    return {
      data: {
        notifications,
        unreadCount
      }, pagination
    }
  }

  async markNotificationAsRead(userId: string) {
    const notification = await this.notificationModel.updateMany({ receiver: { $in: [userId] }, readers: { $nin: [userId] } }, { $addToSet: { readers: userId } })
    await this.cacheService.deleteByPattern(`notification:${userId}`)
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Notification marked as read successfully',
      success: true,
      data: null
    })
  }

  async markNotificationAsReadById(userId: string, notificationId: string) {
    const notification = await this.notificationModel.updateOne({ _id: notificationId, receiver: { $in: [userId] }, readers: { $nin: [userId] } }, { $addToSet: { readers: userId } })
    await this.cacheService.deleteByPattern(`notification:${userId}`)
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Notification marked as read successfully',
      success: true,
      data: null
    })
  }


}

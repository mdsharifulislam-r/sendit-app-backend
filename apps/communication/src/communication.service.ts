import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ISendEmail } from 'utils/helper-modules/email/email.interface';
import { EmailService } from 'utils/helper-modules/email/email.service';
import { Notification, NotificationDocument } from './communication.entity';
import { Model } from 'mongoose';
import { CreateNotificationDto } from './communication.dto';
import { SocketService } from 'utils/helper-modules/socket/socket.service';
import { User, UserDocument } from 'apps/root/src/user/user.entity';
import { USER_ROLES } from 'utils/enums/user';

@Injectable()
export class CommunicationService {
  constructor(
    private readonly emailService: EmailService,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private readonly socketService: SocketService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  async handleSendEmail(payload: ISendEmail) {
    try {
      const res = await this.emailService.sendEmail(payload);
      return res;
    } catch (error) {
      console.log(error);
      return {
        message: 'Failed to send email',
        error: error.message,
      };
    }
  }

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
        this.socketService.emit(`notification-${userId}`, data);
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
}

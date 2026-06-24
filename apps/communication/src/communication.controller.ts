import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { ISendEmail } from 'utils/helper-modules/email/email.interface';
import { CreateNotificationDto } from './communication.dto';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import { Auth } from 'utils/guards/auth.guard';
import { CurrentUser } from 'utils/decorators/user.decorator';
import sendResponse from 'utils/helper/sendResponse';

@Controller('notification')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) { }

  @SqsConsumer('email.send')
  async handleSendEmail(payload: ISendEmail) {
    return await this.communicationService.handleSendEmail(payload)
  }

  @SqsConsumer('notification.send')
  async handleSendNotification(payload: CreateNotificationDto) {
    console.log('🚀 ~ CommunicationController ~ handleSendNotification ~ payload:', payload)
    return await this.communicationService.sendNotification(payload)
  }

  @Get('')
  @Auth()
  async getNotification(@CurrentUser() user: any, @Query() query: Record<string, any>) {
    const data = await this.communicationService.getAllNotifications(user.id, query) as any
    return sendResponse({
      message: 'Notification fetched successfully',
      success: true,
      statusCode: 200,
      data: data.data,
      pagination: data.pagination
    })
  }

  @Patch('mark-as-read')
  @Auth()
  async markNotificationAsRead(@CurrentUser() user: any) {
    return this.communicationService.markNotificationAsRead(user.id)
  }

  @Patch('mark-as-read/:notificationId')
  @Auth()
  async markNotificationAsReadById(@CurrentUser() user: any, @Param('notificationId') notificationId: string) {
    return this.communicationService.markNotificationAsReadById(user.id, notificationId)
  }
}

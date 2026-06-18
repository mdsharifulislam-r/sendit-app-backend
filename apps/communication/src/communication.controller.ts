import { Controller, Get } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { ISendEmail } from 'utils/helper-modules/email/email.interface';
import { CreateNotificationDto } from './communication.dto';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';

@Controller()
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
}

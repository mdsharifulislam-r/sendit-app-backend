import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './chat.entity';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { Message, MessageSchema } from '../message/message.entity';
import { Report, ReportSchema } from '../report/report.entity';
import { MessageService } from '../message/message.service';
import { MessageModule } from '../message/message.module';
import { S3Service } from 'utils/helper-modules/upload/s3.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: User.name, schema: UserSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Report.name, schema: ReportSchema }
    ]),
    SqsModule,
    AuthModule,
    MessageModule

  ],
  controllers: [ChatController],
  providers: [ChatService, MessageService, S3Service],
})
export class ChatModule { }

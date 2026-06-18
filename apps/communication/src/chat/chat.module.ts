import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './chat.entity';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { Message, MessageSchema } from '../message/message.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: User.name, schema: UserSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    SqsModule,
    AuthModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule { }

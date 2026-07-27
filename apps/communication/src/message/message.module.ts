import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './message.entity';
import { Chat, ChatSchema } from '../chat/chat.entity';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { SocketModule } from 'utils/helper-modules/socket/socket.module';
import { S3Service } from 'utils/helper-modules/upload/s3.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Chat.name, schema: ChatSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    SocketModule,
  ],
  controllers: [MessageController],
  providers: [MessageService, S3Service],
})
export class MessageModule { }

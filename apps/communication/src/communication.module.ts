import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { mongooseFactory } from 'utils/config/database';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from 'utils/helper-modules/email/email.module';
import { Notification, NotificationSchema } from './communication.entity';
import { SocketModule } from 'utils/helper-modules/socket/socket.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { Trip, TripSchema } from 'apps/trip/src/trip.entity';
import { StopDetails, StopDetailsSchema } from 'apps/trip/src/stop.entity';
import { Booking, BookingSchema } from 'apps/booking/src/booking.entity';
import { DisclaimerModule } from './disclaimer/disclaimer.module';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { MessageModule } from './message/message.module';
import { ReportModule } from './report/report.module';
import { HealthModule } from 'utils/health/health.module';

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: mongooseFactory,
    }),
    EmailModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
      { name: Trip.name, schema: TripSchema },
      { name: StopDetails.name, schema: StopDetailsSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
    SocketModule,
    SqsModule,
    DisclaimerModule,
    ChatModule,
    MessageModule,
    ReportModule,
    AuthModule
  ],
  controllers: [CommunicationController],
  providers: [CommunicationService],
})
export class CommunicationModule { }

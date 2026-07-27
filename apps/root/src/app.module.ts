import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../../../utils/helper-modules/email/email.module';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SocketModule } from 'utils/helper-modules/socket/socket.module';
import { JwtModule } from '@nestjs/jwt';
// import { KafkaModule } from './utils/helper-modules/kafka/kafka.module';
import { UploadModule } from '../../../utils/helper-modules/upload/upload.module';
import { SqsModule } from '../../../utils/helper-modules/sns/sqs.module';
import { QrModule } from '../../../utils/helper-modules/qr/qr.module';
import { TransportAgreementModule } from './transport-agreement/transport-agreement.module';
import { AddressModule } from './address/address.module';
import { DeviceModule } from './device/device.module';
import { ReferralModule } from './referral/referral.module';


@Module({
  imports: [
    // ─── Config ──────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ─── JWT ────────────────────────────────────────────────
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRE_IN', '7d') as any,
        },
        global: true,
      }),
    }),

    // ─── Database ─────────────────────────────────────────────
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('DB_URI') || 'mongodb://localhost:27017/sendit',
      }),
    }),

    // ─── Static Files ─────────────────────────────────────────
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // ─── Feature Modules ──────────────────────────────────────
    UserModule,
    EmailModule,
    AuthModule,
    SocketModule,
    UploadModule,
    SqsModule,
    QrModule,
    TransportAgreementModule,
    AddressModule,
    DeviceModule,
    ReferralModule
    // KafkaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [JwtModule],
})
export class AppModule { }

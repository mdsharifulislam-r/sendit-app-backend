import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema, ResetToken, ResetTokenSchema, FaceVerification, FaceVerificationSchema } from '../user/user.entity';
import { EmailModule } from '../../../../utils/helper-modules/email/email.module';
import { AuthGuard } from 'utils/guards/auth.guard';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { Device, DeviceSchema } from '../device/device.entity';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { RedisCacheModule } from 'utils/helper-modules/cache/cache.module';
import { S3Service } from 'utils/helper-modules/upload/s3.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ResetToken.name, schema: ResetTokenSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: FaceVerification.name, schema: FaceVerificationSchema }
    ]),
    EmailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRE_IN', '7d') as any,
        },
      }),
    }),
    SqsModule,
    RedisCacheModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, S3Service],
  exports: [JwtModule, AuthGuard, MongooseModule, RedisCacheModule],
})
export class AuthModule { }

import { Module } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from './device.entity';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { AuthModule } from '../auth/auth.module';
import { RedisCacheModule } from 'utils/helper-modules/cache/cache.module';


@Module({
  imports: [MongooseModule.forFeature([{ name: Device.name, schema: DeviceSchema }]), SqsModule, AuthModule, RedisCacheModule],
  controllers: [DeviceController],
  providers: [DeviceService],
})
export class DeviceModule { }

import { Module } from '@nestjs/common';
import { DisclaimerService } from './disclaimer.service';
import { DisclaimerController } from './disclaimer.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Disclaimer, DisclaimerSchema } from './disclaimer.entity';
import { RedisCacheModule } from 'utils/helper-modules/cache/cache.module';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Disclaimer.name, schema: DisclaimerSchema }]),
    RedisCacheModule,
    AuthModule,
    SqsModule
  ],
  controllers: [DisclaimerController],
  providers: [DisclaimerService],
})
export class DisclaimerModule { }

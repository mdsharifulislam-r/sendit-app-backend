import { Module } from '@nestjs/common';
import { RiskSettingsService } from './risk-settings.service';
import { RiskSettingsController } from './risk-settings.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RiskSettings, RiskSettingsSchema, RiskyItems, RiskyItemsSchema } from './risk-settings.entity';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';

@Module({
  imports: [MongooseModule.forFeature([
    { name: RiskSettings.name, schema: RiskSettingsSchema },
    { name: RiskyItems.name, schema: RiskyItemsSchema }
  ]),

    AuthModule,
    SqsModule
  ],
  controllers: [RiskSettingsController],
  providers: [RiskSettingsService],
})
export class RiskSettingsModule { }

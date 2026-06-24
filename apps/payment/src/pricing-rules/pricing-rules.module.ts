import { Module } from '@nestjs/common';
import { PricingRulesService } from './pricing-rules.service';
import { PricingRulesController } from './pricing-rules.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { PricingRules, PricingRulesSchema } from './pricing-rules.entity';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PricingRules.name, schema: PricingRulesSchema }]),
    AuthModule,
    SqsModule,
  ],
  controllers: [PricingRulesController],
  providers: [PricingRulesService],
  exports: [PricingRulesService],
})
export class PricingRulesModule { }

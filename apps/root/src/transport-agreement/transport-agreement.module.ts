import { Module } from '@nestjs/common';
import { TransportAgreementService } from './transport-agreement.service';
import { TransportAgreementController } from './transport-agreement.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TransportAgreement, TransportAgreementSchema } from './transport-agreement.entity';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TransportAgreement.name, schema: TransportAgreementSchema },
    ]),
    AuthModule,
    SqsModule,
  ],
  controllers: [TransportAgreementController],
  providers: [TransportAgreementService],
  exports: [TransportAgreementService]
})
export class TransportAgreementModule { }

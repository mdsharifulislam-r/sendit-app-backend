import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { SqsConsumerRegistry } from './sqs-consumer.registry';
import { SnsService } from './sns.service';
import { SqsConsumerService } from './sqs-consumer.service';

@Global()
@Module({
    imports: [DiscoveryModule],
    providers: [SqsConsumerRegistry, SnsService, SqsConsumerService],
    exports: [SqsConsumerRegistry, SnsService, SqsConsumerService],
})
export class SqsModule { }
// kafka.module.ts
import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';
import { ConfigService } from '@nestjs/config';
import { KafkaConsumer } from './kafka.consumer';


@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'kafka',
              brokers: [config.get('KAFKA_URL')!],
            },
            consumer: {
              groupId: 'my-consumer-app'
            },
          },
        }),
      }
    ]),
  ],
  providers: [KafkaService],
  exports: [KafkaService],
  controllers: [KafkaConsumer],
})
export class KafkaModule {}
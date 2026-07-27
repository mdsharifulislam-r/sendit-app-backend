import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class KafkaService implements OnModuleInit {
  private readonly logger = new Logger(KafkaService.name);

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafka: ClientKafka,
  ) { }

  async onModuleInit() {
    this.kafka.subscribeToResponseOf('test');
    await this.kafka.connect();
    this.logger.log('Kafka connected successfully');
  }

  /** Fire-and-forget: emit an event to a topic */
  emit<T>(topic: string, message: T) {
    return this.kafka.emit(topic, { value: message });
  }

  /** Request-reply: send a message and await a response */
  async send(topic: string, message: any) {
    const data = await firstValueFrom(this.kafka.send(topic, { value: message }));

    return data;
  }
}

import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import handleUtilsConsumer from './consumers/utils.consumer';

@Controller()
export class KafkaConsumer {

  @EventPattern('utils-event')
  async handleUtlilsEvent(@Payload() payload: any) {

    await handleUtilsConsumer(payload);
  }
}
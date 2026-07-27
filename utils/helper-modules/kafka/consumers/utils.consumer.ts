import { Logger } from '@nestjs/common';

const logger = new Logger('UtilsConsumer');

const handleUtilsConsumer = async (data: { type: string; data: any }) => {
  try {
    switch (data.type) {
      case 'log':
        logger.log(`Kafka log event: ${JSON.stringify(data.data)}`);
        break;
      default:
        logger.warn(`Unknown Kafka message type: ${data.type}`);
    }
  } catch (error) {
    logger.error('Error handling Kafka message', error);
  }
};

export default handleUtilsConsumer;

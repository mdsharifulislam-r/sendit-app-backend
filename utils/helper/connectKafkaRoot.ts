import { INestApplication, Logger } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';

const logger = new Logger('KafkaMicroservice');

export async function connectKafkaMicroService(app: INestApplication) {
  try {
    app.connectMicroservice({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: [process.env.KAFKA_URL!],
        },
        consumer: {
          groupId: process.env.KAFKA_GROUP_ID || 'nestjs-consumer-group',
        },
      },
    });
    logger.log('Kafka microservice connected');
  } catch (error) {
    logger.error('Failed to connect Kafka microservice', error);
  }
}

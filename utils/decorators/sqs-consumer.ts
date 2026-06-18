// sqs-consumer.decorator.ts
import 'reflect-metadata';

export const SQS_CONSUMER_KEY = 'SQS_CONSUMER_KEY';

export function SqsConsumer(eventType: string): MethodDecorator {
    return (target, propertyKey, descriptor: any) => {
        Reflect.defineMetadata(
            SQS_CONSUMER_KEY,
            eventType,
            descriptor.value,
        );
    };
}
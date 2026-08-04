import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
    SQSClient,
    ReceiveMessageCommand,
    DeleteMessageCommand,
    ChangeMessageVisibilityCommand,
} from '@aws-sdk/client-sqs';
import { awsClientConfig } from 'utils/config/aws-client';
import { SqsConsumerRegistry } from './sqs-consumer.registry';

@Injectable()
export class SqsConsumerService implements OnApplicationBootstrap {
    private sqs = new SQSClient(awsClientConfig());

    private queueUrl: string = '';

    constructor(private registry: SqsConsumerRegistry) { }

    onApplicationBootstrap() {
        this.queueUrl = this.getQueueUrl();
        if (this.registry.hasHandlers()) {
            console.log(`[SqsConsumerService] Handlers registered. Starting SQS polling on queue: ${this.queueUrl}`);
            this.poll();
        } else {
            console.log(`[SqsConsumerService] No handlers registered. Skipping SQS polling.`);
        }
    }

    private getQueueUrl(): string {
        const serviceName = (process.env.SERVICE_NAME || 'root').toUpperCase();
        const serviceQueueUrl = process.env[`${serviceName}_SQS_QUEUE_URL`];

        if (serviceQueueUrl) {
            console.log(
                `[SqsConsumerService] Using service-specific queue URL for ${serviceName}: ${serviceQueueUrl}`,
            );
            return serviceQueueUrl;
        }

        if (process.env.SQS_QUEUE_URL) {
            console.log(
                `[SqsConsumerService] Using default queue URL: ${process.env.SQS_QUEUE_URL}`,
            );
            return process.env.SQS_QUEUE_URL;
        }

        throw new Error(
            `[SqsConsumerService] No SQS queue URL configured for service "${serviceName}"`,
        );
    }

    async poll() {
        while (true) {
            try {
                const res = await this.sqs.send(
                    new ReceiveMessageCommand({
                        QueueUrl: this.queueUrl,
                        MaxNumberOfMessages: 10,
                        WaitTimeSeconds: 20,
                    }),
                );

                for (const msg of res.Messages || []) {
                    try {
                        const body = JSON.parse(msg.Body!);
                        // If SQS is subscribed to an SNS topic, the SNS message is stored inside the 'Message' property as a JSON string.
                        const payload = body.Message && typeof body.Message === 'string' ? JSON.parse(body.Message) : body;
                        console.log(payload);

                        if (!payload || !payload.eventType) {
                            // Malformed or no eventType, delete it to keep queue clean
                            await this.sqs.send(
                                new DeleteMessageCommand({
                                    QueueUrl: this.queueUrl,
                                    ReceiptHandle: msg.ReceiptHandle!,
                                }),
                            );
                            continue;
                        }

                        const handler = this.registry.getHandler(payload.eventType);
                        if (handler) {
                            await handler(payload.data);
                            await this.sqs.send(
                                new DeleteMessageCommand({
                                    QueueUrl: this.queueUrl,
                                    ReceiptHandle: msg.ReceiptHandle!,
                                }),
                            );
                        } else {
                            // Determine if using a shared or dedicated queue
                            const isSharedQueue = !process.env.SQS_QUEUE_URL || this.queueUrl === process.env.SQS_QUEUE_URL;

                            if (isSharedQueue) {
                                // Shared queue workaround: release message back with non-zero VisibilityTimeout (e.g., 15s)
                                // to allow other services to poll it, avoiding rapid DLQ retry loops.
                                console.warn(`[SqsConsumerService] Warning: Received event "${payload.eventType}" with no local handler. Using shared queue. Releasing back with 15s delay. Please configure dedicated queues for production/performance.`);
                                await this.sqs.send(
                                    new ChangeMessageVisibilityCommand({
                                        QueueUrl: this.queueUrl,
                                        ReceiptHandle: msg.ReceiptHandle!,
                                        VisibilityTimeout: 2,
                                    }),
                                );
                            } else {
                                // Dedicated queue: safely delete unhandled messages because no other service is polling this queue.
                                console.log(`[SqsConsumerService] Received event "${payload.eventType}" with no handler on dedicated queue. Safely deleting message.`);
                                await this.sqs.send(
                                    new ChangeMessageVisibilityCommand({
                                        QueueUrl: this.queueUrl,
                                        ReceiptHandle: msg.ReceiptHandle!,
                                        VisibilityTimeout: 2,
                                    }),
                                );
                            }
                        }
                    } catch (err) {
                        console.error('Error processing message:', err);
                    }
                }
            } catch (err) {
                console.error('Error polling SQS queue:', err);
                // Avoid tight loop in case of continuous AWS connection failures
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
    }
}
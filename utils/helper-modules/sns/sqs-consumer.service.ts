import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
    SQSClient,
    ReceiveMessageCommand,
    DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { awsClientConfig } from 'utils/config/aws-client';
import { SqsConsumerRegistry } from './sqs-consumer.registry';
import { EVENT_SERVICE_MAP } from 'utils/config/sqs-events';

@Injectable()
export class SqsConsumerService implements OnApplicationBootstrap {
    private static pollingStarted = false;
    private client: SQSClient | null = null;
    private queueUrl = '';

    constructor(private registry: SqsConsumerRegistry) { }

    private sqs() {
        if (!this.client) {
            this.client = new SQSClient(awsClientConfig());
        }
        return this.client;
    }

    onApplicationBootstrap() {
        this.registry.scan();
        this.queueUrl = this.getQueueUrl();

        if (!this.registry.hasHandlers()) {
            console.log('[SqsConsumerService] No handlers registered. Skipping SQS polling.');
            return;
        }

        if (SqsConsumerService.pollingStarted) {
            console.log('[SqsConsumerService] Polling already started — skipping duplicate consumer.');
            return;
        }
        SqsConsumerService.pollingStarted = true;

        console.log(`[SqsConsumerService] Starting SQS polling on queue: ${this.queueUrl}`);
        this.poll().catch((err) => {
            console.error('[SqsConsumerService] Poll loop crashed:', err);
            SqsConsumerService.pollingStarted = false;
        });
    }

    private getQueueUrl(): string {
        const serviceName = (process.env.SERVICE_NAME || 'root').toUpperCase();
        const url =
            process.env.SQS_QUEUE_URL ||
            process.env[`${serviceName}_SQS_QUEUE_URL`];

        if (!url) {
            throw new Error(
                `[SqsConsumerService] No SQS queue URL configured for service "${serviceName}"`,
            );
        }

        console.log(`[SqsConsumerService] Queue for ${serviceName}: ${url}`);
        return url;
    }

    async poll() {
        while (true) {
            try {
                const res = await this.sqs().send(
                    new ReceiveMessageCommand({
                        QueueUrl: this.queueUrl,
                        MaxNumberOfMessages: 10,
                        WaitTimeSeconds: 20,
                    }),
                );

                for (const msg of res.Messages || []) {
                    const serviceName = (process.env.SERVICE_NAME || 'root').toUpperCase();
                    try {
                        const body = JSON.parse(msg.Body!);
                        const payload =
                            body.Message && typeof body.Message === 'string'
                                ? JSON.parse(body.Message)
                                : body;

                        if (!payload || !payload.eventType) {
                            console.warn('[SqsConsumerService] Message missing eventType — deleting');
                            await this.deleteMessage(msg.ReceiptHandle!);
                            continue;
                        }

                        const owner = EVENT_SERVICE_MAP[payload.eventType];
                        const thisService = (process.env.SERVICE_NAME || 'root').toLowerCase();
                        const handler = this.registry.getHandler(payload.eventType);

                        if (owner && owner !== thisService) {
                            console.log(
                                `[SqsConsumerService] "${payload.eventType}" belongs to ${owner}, not ${thisService} — deleting copy`,
                            );
                            await this.deleteMessage(msg.ReceiptHandle!);
                            continue;
                        }

                        if (!handler) {
                            console.log(
                                `[SqsConsumerService] No handler for "${payload.eventType}" on ${serviceName} — deleting copy`,
                            );
                            await this.deleteMessage(msg.ReceiptHandle!);
                            continue;
                        }

                        console.log(`[SqsConsumerService] Handling "${payload.eventType}" on ${serviceName}`);
                        await handler(payload.data);
                        await this.deleteMessage(msg.ReceiptHandle!);
                    } catch (err) {
                        console.error('Error processing message:', err);
                    }
                }
            } catch (err) {
                console.error('Error polling SQS queue:', err);
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
    }

    private deleteMessage(receiptHandle: string) {
        return this.sqs().send(
            new DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: receiptHandle,
            }),
        );
    }
}

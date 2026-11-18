import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
    SQSClient,
    ReceiveMessageCommand,
    DeleteMessageCommand,
    ChangeMessageVisibilityCommand,
    Message,
} from '@aws-sdk/client-sqs';
import { awsClientConfig } from 'utils/config/aws-client';
import { SqsConsumerRegistry } from './sqs-consumer.registry';
import { EVENT_SERVICE_MAP } from 'utils/config/sqs-events';

@Injectable()
export class SqsConsumerService implements OnApplicationBootstrap {
    private static pollingStarted = false;
    private client: SQSClient | null = null;
    private queueUrls: string[] = [];

    /** Shared-queue: how long to hide a message we cannot handle (seconds). 0 = release immediately. */
    private readonly sharedReleaseSeconds = Number(
        process.env.SQS_SHARED_VISIBILITY_TIMEOUT ?? 0,
    );

    constructor(private registry: SqsConsumerRegistry) { }

    private sqs() {
        if (!this.client) {
            this.client = new SQSClient(awsClientConfig());
        }
        return this.client;
    }

    onApplicationBootstrap() {
        this.registry.scan();
        this.queueUrls = this.getQueueUrls();

        if (!this.registry.hasHandlers()) {
            console.log('[SqsConsumerService] No handlers registered. Skipping SQS polling.');
            return;
        }

        if (!this.queueUrls.length) {
            throw new Error(
                `[SqsConsumerService] No SQS queue URL configured for service "${process.env.SERVICE_NAME || 'root'}"`,
            );
        }

        if (SqsConsumerService.pollingStarted) {
            console.log('[SqsConsumerService] Polling already started — skipping duplicate consumer.');
            return;
        }
        SqsConsumerService.pollingStarted = true;

        console.log(
            `[SqsConsumerService] Starting SQS polling on queues: ${this.queueUrls.join(', ')}`,
        );

        for (const queueUrl of this.queueUrls) {
            this.poll(queueUrl).catch((err) => {
                console.error(`[SqsConsumerService] Poll loop crashed for ${queueUrl}:`, err);
                // Allow restart of this loop only
            });
        }
    }

    private getQueueUrls(): string[] {
        const serviceName = (process.env.SERVICE_NAME || 'root').toUpperCase();
        const urls: string[] = [];

        const serviceFifo = process.env[`${serviceName}_SQS_FIFO_QUEUE_URL`];
        if (serviceFifo) urls.push(serviceFifo);

        const serviceStd =
            process.env[`${serviceName}_SQS_QUEUE_URL`] || process.env.SQS_QUEUE_URL;
        if (serviceStd && !urls.includes(serviceStd)) urls.push(serviceStd);

        if (
            process.env.SQS_FIFO_QUEUE_URL &&
            !serviceFifo &&
            !urls.includes(process.env.SQS_FIFO_QUEUE_URL)
        ) {
            urls.push(process.env.SQS_FIFO_QUEUE_URL);
        }

        console.log(
            `[SqsConsumerService] Queues for ${serviceName}: ${urls.join(', ') || '(none)'}`,
        );
        return urls;
    }

    private isDedicatedQueue(queueUrl: string): boolean {
        const serviceName = (process.env.SERVICE_NAME || 'root').toUpperCase();
        return (
            process.env[`${serviceName}_SQS_QUEUE_URL`] === queueUrl ||
            process.env[`${serviceName}_SQS_FIFO_QUEUE_URL`] === queueUrl
        );
    }

    async poll(queueUrl: string) {
        while (true) {
            try {
                const res = await this.sqs().send(
                    new ReceiveMessageCommand({
                        QueueUrl: queueUrl,
                        MaxNumberOfMessages: 10,
                        // Long-poll: AWS returns as soon as a message arrives (up to 20s)
                        WaitTimeSeconds: 20,
                        // Enough time for handlers; wrong-owner msgs are released early
                        VisibilityTimeout: 60,
                    }),
                );

                const messages = res.Messages || [];
                if (!messages.length) continue;

                // Process batch in parallel — do not wait one-by-one
                await Promise.allSettled(
                    messages.map((msg) => this.handleMessage(queueUrl, msg)),
                );
            } catch (err) {
                console.error(`Error polling SQS queue ${queueUrl}:`, err);
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
    }

    private async handleMessage(queueUrl: string, msg: Message) {
        const serviceName = (process.env.SERVICE_NAME || 'root').toUpperCase();
        try {
            const body = JSON.parse(msg.Body!);
            const payload =
                body.Message && typeof body.Message === 'string'
                    ? JSON.parse(body.Message)
                    : body;

            if (!payload || !payload.eventType) {
                await this.deleteMessage(queueUrl, msg.ReceiptHandle!);
                return;
            }

            const handler = this.registry.getHandler(payload.eventType);

            if (handler) {
                console.log(
                    `[SqsConsumerService] Handling "${payload.eventType}" on ${serviceName}`,
                );
                await handler(payload.data);
                await this.deleteMessage(queueUrl, msg.ReceiptHandle!);
                return;
            }

            const owner = EVENT_SERVICE_MAP[payload.eventType];

            if (this.isDedicatedQueue(queueUrl)) {
                // Per-service queue: this copy is not for us — delete so it does not retry forever
                console.log(
                    `[SqsConsumerService] "${payload.eventType}" not handled here (owner=${owner ?? 'n/a'}) — deleting dedicated copy`,
                );
                await this.deleteMessage(queueUrl, msg.ReceiptHandle!);
                return;
            }

            // Shared queue (local/dev): release immediately so the owning service can pick it up
            console.log(
                `[SqsConsumerService] "${payload.eventType}" belongs to ${owner ?? 'unknown'} — releasing shared message`,
            );
            await this.releaseMessage(
                queueUrl,
                msg.ReceiptHandle!,
                this.sharedReleaseSeconds,
            );
        } catch (err) {
            console.error('Error processing message:', err);
            // Leave invisible until VisibilityTimeout so SQS can retry
        }
    }

    private deleteMessage(queueUrl: string, receiptHandle: string) {
        return this.sqs().send(
            new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: receiptHandle,
            }),
        );
    }

    private releaseMessage(
        queueUrl: string,
        receiptHandle: string,
        visibilityTimeout = 0,
    ) {
        return this.sqs().send(
            new ChangeMessageVisibilityCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: receiptHandle,
                VisibilityTimeout: visibilityTimeout,
            }),
        );
    }
}

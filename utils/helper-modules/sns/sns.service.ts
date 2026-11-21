import { Injectable } from '@nestjs/common';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { awsClientConfig } from 'utils/config/aws-client';
import { getQueueUrlForEvent } from 'utils/config/sqs-events';
import { SqsConsumerRegistry } from './sqs-consumer.registry';

export type SnsPublishOptions = {
  /** When true, publish to FIFO SNS/SQS (ordered + deduped). Default false. */
  isFifo?: boolean;
  /** FIFO MessageGroupId. Prefer an entity id so unrelated events process in parallel. */
  messageGroupId?: string;
  /**
   * Force queue even if this process has a local handler.
   * Default false = run in-process when possible (instant).
   */
  forceQueue?: boolean;
};

@Injectable()
export class SnsService {
  private snsClient: SNSClient | null = null;
  private sqsClient: SQSClient | null = null;

  constructor(private readonly registry: SqsConsumerRegistry) {}

  private sns() {
    if (!this.snsClient) this.snsClient = new SNSClient(awsClientConfig());
    return this.snsClient;
  }

  private sqs() {
    if (!this.sqsClient) this.sqsClient = new SQSClient(awsClientConfig());
    return this.sqsClient;
  }

  /**
   * Publish an event.
   * 1) If this process owns the handler → run immediately (no SQS lag)
   * 2) Else → SQS (or SNS fallback)
   *
   * Existing callers `publish(event, data)` stay compatible.
   * Pass `{ isFifo: true }` for money/confirm flows.
   */
  async publish<T>(
    eventType: string,
    data: T,
    options: SnsPublishOptions = {},
  ) {
    if (!options.forceQueue) {
      if (!this.registry.hasHandlers()) {
        this.registry.scan();
      }
      const localHandler = this.registry.getHandler(eventType);
      if (localHandler) {
        try {
          await localHandler(data);
          console.log(`[SnsService] In-process "${eventType}"`);
          return;
        } catch (err) {
          console.error(
            `[SnsService] In-process "${eventType}" failed, falling back to queue:`,
            err,
          );
        }
      }
    }

    const isFifo = options.isFifo === true;
    const payload = JSON.stringify({ eventType, data });
    const topicArn = isFifo
      ? process.env.SNS_FIFO_TOPIC_ARN
      : process.env.SNS_TOPIC_ARN;
    const targetQueueUrl = getQueueUrlForEvent(eventType, isFifo);

    try {
      if (targetQueueUrl) {
        const commandInput: Record<string, unknown> = {
          QueueUrl: targetQueueUrl,
          MessageBody: payload,
        };

        if (isFifo) {
          commandInput.MessageGroupId = this.resolveMessageGroupId(
            eventType,
            data,
            options,
          );
          commandInput.MessageDeduplicationId = `${eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }

        await this.sqs().send(new SendMessageCommand(commandInput as any));
        console.log(
          `[SnsService] SQS${isFifo ? ' FIFO' : ''} "${eventType}" → ${targetQueueUrl}`,
        );
        return;
      }

      if (!topicArn) {
        throw new Error(
          `[SnsService] Cannot publish "${eventType}": no ${isFifo ? 'FIFO ' : ''}queue URL and ${isFifo ? 'SNS_FIFO_TOPIC_ARN' : 'SNS_TOPIC_ARN'} is not set`,
        );
      }

      const snsInput: Record<string, unknown> = {
        TopicArn: topicArn,
        Message: payload,
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: eventType,
          },
        },
      };

      if (isFifo) {
        snsInput.MessageGroupId = this.resolveMessageGroupId(
          eventType,
          data,
          options,
        );
        snsInput.MessageDeduplicationId = `${eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }

      const result = await this.sns().send(new PublishCommand(snsInput as any));
      console.log(
        `[SnsService] SNS${isFifo ? ' FIFO' : ''} "${eventType}" → ${topicArn} (${result.MessageId})`,
      );
    } catch (err) {
      console.error(`[SnsService] Failed to publish "${eventType}":`, err);
      throw err;
    }
  }

  private resolveMessageGroupId<T>(
    eventType: string,
    data: T,
    options?: SnsPublishOptions,
  ): string {
    if (options?.messageGroupId) return String(options.messageGroupId);

    const d = data as Record<string, any> | string | null | undefined;
    if (typeof d === 'string' && d.length) {
      return `${eventType}:${d}`;
    }

    if (d && typeof d === 'object') {
      const candidate =
        d.userId ??
        d.user ??
        d.bookingId ??
        d.transactionId ??
        d.code ??
        d.id ??
        d._id;

      if (candidate != null && String(candidate).length) {
        return `${eventType}:${candidate}`;
      }
    }

    return eventType;
  }

  async sendOtpInPhoneNumber(phoneNumber: string, otp: string) {
    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: `
            Hello, Your OTP for Sendit is ${otp}. 
            This OTP will expire in 5 minutes.
            Do not share this OTP with anyone. 
            Thank you for using Sendit
            `,
    });

    return await this.sns().send(command);
  }
}

import { Injectable } from '@nestjs/common';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { awsClientConfig } from 'utils/config/aws-client';
import { getQueueUrlForEvent } from 'utils/config/sqs-events';

@Injectable()
export class SnsService {
    private snsClient: SNSClient | null = null;
    private sqsClient: SQSClient | null = null;

    private sns() {
        if (!this.snsClient) this.snsClient = new SNSClient(awsClientConfig());
        return this.snsClient;
    }

    private sqs() {
        if (!this.sqsClient) this.sqsClient = new SQSClient(awsClientConfig());
        return this.sqsClient;
    }

    async publish<T>(eventType: string, data: T) {
        const payload = JSON.stringify({ eventType, data });
        const topicArn = process.env.SNS_TOPIC_ARN;
        const targetQueueUrl = getQueueUrlForEvent(eventType);

        try {
            if (targetQueueUrl) {
                await this.sqs().send(
                    new SendMessageCommand({
                        QueueUrl: targetQueueUrl,
                        MessageBody: payload,
                    }),
                );
                console.log(`[SnsService] SQS "${eventType}" → ${targetQueueUrl}`);
                return;
            }

            if (!topicArn) {
                throw new Error(
                    `[SnsService] Cannot publish "${eventType}": no ${eventType} queue URL and SNS_TOPIC_ARN is not set`,
                );
            }

            const result = await this.sns().send(
                new PublishCommand({
                    TopicArn: topicArn,
                    Message: payload,
                    MessageAttributes: {
                        eventType: {
                            DataType: 'String',
                            StringValue: eventType,
                        },
                    },
                }),
            );
            console.log(`[SnsService] SNS "${eventType}" → ${topicArn} (${result.MessageId})`);
        } catch (err) {
            console.error(`[SnsService] Failed to publish "${eventType}":`, err);
            throw err;
        }
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

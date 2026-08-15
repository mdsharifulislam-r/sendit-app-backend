import { Injectable } from '@nestjs/common';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { awsClientConfig } from 'utils/config/aws-client';

@Injectable()
export class SnsService {
    private sns = new SNSClient(awsClientConfig());

    async publish<T>(eventType: string, data: T) {
        const topicArn = process.env.SNS_TOPIC_ARN;
        if (!topicArn) {
            throw new Error('[SnsService] SNS_TOPIC_ARN is not set');
        }

        const command = new PublishCommand({
            TopicArn: topicArn,
            Message: JSON.stringify({
                eventType,
                data,
            }),
            MessageAttributes: {
                eventType: {
                    DataType: 'String',
                    StringValue: eventType,
                },
            },
        });

        try {
            const result = await this.sns.send(command);
            console.log(`[SnsService] Published "${eventType}" → ${topicArn}`);
            return result;
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
            `
        });

        return await this.sns.send(command);
    }
}
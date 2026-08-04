import { Injectable } from '@nestjs/common';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { awsClientConfig } from 'utils/config/aws-client';

@Injectable()
export class SnsService {
    private sns = new SNSClient(awsClientConfig());

    async publish<T>(eventType: string, data: T) {
        const command = new PublishCommand({
            TopicArn: process.env.SNS_TOPIC_ARN,
            Message: JSON.stringify({
                eventType,
                data,
            }),
        });

        try {
            const result = await this.sns.send(command);
            console.log(`[SnsService] Published "${eventType}" → ${process.env.SNS_TOPIC_ARN}`);
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
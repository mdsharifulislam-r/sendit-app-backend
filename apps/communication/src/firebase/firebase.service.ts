import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { SendPushNotificationDto } from './firebase.dto';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import { Model } from 'mongoose';
import { User, UserDocument } from 'apps/root/src/user/user.entity';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class FirebaseService {
    private readonly logger = new Logger(FirebaseService.name);
    private readonly firebaseApp?: App;

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) {
        const existingApp = getApps()[0];
        if (existingApp) {
            this.firebaseApp = existingApp;
            return;
        }

        const serviceAccountPath = this.resolveServiceAccountPath();
        if (!serviceAccountPath) {
            this.logger.warn(
                'firebase.json not found. Push notifications are disabled until you add the Firebase service account file.',
            );
            return;
        }

        if (!this.hasRealPrivateKey(serviceAccountPath)) {
            this.logger.warn(
                'firebase.json still has placeholder credentials. Replace the file with the JSON downloaded from Firebase Console > Project settings > Service accounts.',
            );
            return;
        }

        this.firebaseApp = initializeApp({
            credential: cert(serviceAccountPath),
        });
    }

    private resolveServiceAccountPath(): string | undefined {
        return [
            join(__dirname, 'firebase.json'),
            join(process.cwd(), 'apps/communication/src/firebase/firebase.json'),
        ].find((path) => existsSync(path));
    }

    private hasRealPrivateKey(serviceAccountPath: string): boolean {
        const serviceAccount = JSON.parse(
            readFileSync(serviceAccountPath, 'utf8'),
        );
        const privateKey = serviceAccount.private_key as string | undefined;

        return Boolean(
            privateKey &&
            privateKey.includes('BEGIN PRIVATE KEY') &&
            !privateKey.includes('YOUR_PRIVATE_KEY'),
        );
    }
    @SqsConsumer('notification.send.push')
    async sendPushNotification(
        payload: SendPushNotificationDto,
    ) {
        try {

            const tokens = await this.userModel.find({
                _id: {
                    $in: payload.userIds,
                },
                $and: [
                    { 'fcm_tokens': { $ne: null } },
                    { 'fcm_tokens': { $ne: [] } },
                ]
            }).distinct('fcm_tokens')

            console.log(tokens)

            if (!this.firebaseApp) {
                this.logger.warn('Skipping push notification because Firebase is not initialized.');
                return;
            }

            const { title, body } = payload;
            for (const token of tokens) {
                try {
                    const response = await getMessaging(this.firebaseApp).send({
                        token,
                        notification: {
                            title,
                            body,
                        },
                    });
                    this.logger.log(`Notification sent to ${token}: ${response}`);
                } catch (error) {
                    console.log(error);
                }
            }
        } catch (error) {
            console.log(error);
        }

    }
}
import { Injectable } from '@nestjs/common';
import {
    DeleteObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';

import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as mime from 'mime-types';
import { unlinkSync } from 'fs';

@Injectable()
export class S3Service {
    private s3 = new S3Client({
        region: process.env.AWS_REGION,
        endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });

    async uploadFile(filePath: string) {
        const localPath = path.join(
            process.cwd(),
            'uploads',
            filePath,
        );

        const ext = path.extname(filePath);

        const baseName = path.basename(filePath)?.split('.')[0];

        const fileKey = `uploads/${baseName}${ext}`;

        const fileBuffer = await fs.readFile(localPath);

        const mimeType =
            mime.lookup(localPath) || 'application/octet-stream';

        this.s3.send(
            new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: fileKey,
                Body: fileBuffer,
                ContentType: mimeType,
            }),
        ).then(() => {

            try {
                unlinkSync(localPath)
                console.log('File uploaded successfully');
            } catch (error) {

            }
        });

        return {
            key: fileKey,
            url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
        };
    }

    async uploadMultipleFiles(filepaths: string[]) {
        const data = await Promise.all(filepaths.map(async (f) => (await this.uploadFile(f)).url))
        return data
    }

    async deleteFile(filePath: string) {
        const fileKey = filePath?.split(`${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1]
        this.s3.send(
            new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: fileKey,
            }),
        );
    }

    async deleteMultipleFiles(keys: string[]) {
        await Promise.all(keys.map((k) => this.deleteFile(k)))
    }
}
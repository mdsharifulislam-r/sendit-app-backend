import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { S3Service } from 'utils/helper-modules/upload/s3.service';
import { InjectModel } from '@nestjs/mongoose';
import { Booking, BookingDocument } from 'apps/booking/src/booking.entity';
import { Model } from 'mongoose';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';

@Injectable()
export class QrService {
    constructor(
        private readonly s3Service: S3Service,
        @InjectModel(Booking.name)
        private readonly bookingModel: Model<BookingDocument>,
    ) { }

    @SqsConsumer('qr.code.generate')
    async generateQRCode({ data, id }: { data: string, id: string }) {
        console.log('🚀 ~ QrService ~ generateQRCode ~ data, id:', data, id);
        const fileName = `${crypto.randomUUID()}.png`;

        const uploadDir = path.join(
            process.cwd(),
            'uploads',
            'qrCode',
        );

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);

        await QRCode.toFile(filePath, data, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        });

        const url = await this.s3Service.uploadFile(`qrCode/${fileName}`);

        await this.bookingModel.findOneAndUpdate({ id }, { qr_code: url.url });
    }
}

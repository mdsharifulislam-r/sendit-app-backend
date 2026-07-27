import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ISendEmail } from './email.interface';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.fromAddress = this.configService.get<string>('EMAIL_FROM', 'noreply@example.com');

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT', 587),
      secure: this.configService.get<number>('EMAIL_PORT', 587) === 465,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendEmail(values: ISendEmail): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.configService.get('APP_NAME', 'NestJS App')}" <${this.fromAddress}>`,
        to: values.to,
        subject: values.subject,
        html: values.html,
      });
      this.logger.log(`Email sent to ${values.to} | MessageId: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${values.to}`, error);
      throw error;
    }
  }
}

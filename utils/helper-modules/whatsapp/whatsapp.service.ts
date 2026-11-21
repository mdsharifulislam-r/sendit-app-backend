import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiError } from 'utils/errors/api-error';

type WhatsappButtonType = 'none' | 'url' | 'copy_code';

interface MetaGraphError {
  message?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

interface MetaGraphResponse {
  error?: MetaGraphError;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(phone: string, otp: string): Promise<void> {
    const phoneNumberId = this.configService
      .get<string>('WHATSAPP_PHONE_NUMBER_ID')
      ?.trim();
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim();
    const version = this.configService.get<string>('WHATSAPP_API_VERSION', 'v21.0').trim();

    if (!phoneNumberId || !accessToken) {
      throw new ApiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'WhatsApp is not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.',
      );
    }

    const to = phone.replace(/\D/g, '');
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const payload = this.buildMessagePayload(to, otp);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let result: MetaGraphResponse;
    try {
      result = (await response.json()) as MetaGraphResponse;
    } catch {
      console.log('WhatsApp API returned a non-JSON response:', await response.text());
      this.logger.error(`WhatsApp API returned an invalid response (HTTP ${response.status})`);
      throw new ApiError(HttpStatus.BAD_GATEWAY, 'WhatsApp API returned an invalid response.');
    }

    if (!response.ok) {
      const graphError = result.error;
      const graphMessage =
        graphError?.code === 190
          ? 'WhatsApp authentication failed (Meta error 190). Replace WHATSAPP_ACCESS_TOKEN with a valid, unexpired token that has WhatsApp permissions, then restart or redeploy the service.'
          : graphError?.message || 'Failed to send WhatsApp OTP via Meta Cloud API';
      const errorDetails = [
        graphError?.code !== undefined ? `code ${graphError.code}` : undefined,
        graphError?.error_subcode !== undefined
          ? `subcode ${graphError.error_subcode}`
          : undefined,
        graphError?.fbtrace_id ? `trace ${graphError.fbtrace_id}` : undefined,
      ]
        .filter(Boolean)
        .join(', ');
      this.logger.error(
        `WhatsApp send failed for ${to}: ${graphMessage}${errorDetails ? ` (${errorDetails})` : ''}`,
      );
      throw new ApiError(HttpStatus.BAD_GATEWAY, graphMessage);
    }

    this.logger.log(`WhatsApp OTP sent to ${to}`);
  }

  private buildMessagePayload(to: string, otp: string) {
    const useText = this.configService.get<string>('WHATSAPP_OTP_USE_TEXT') === 'true';

    if (useText) {
      return {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body: `Your Sendit verification code is ${otp}. It expires in 3 minutes. Do not share this code.`,
        },
      };
    }

    const templateName = this.configService.get<string>(
      'WHATSAPP_OTP_TEMPLATE_NAME',
      'sendit_otp',
    );
    const language = this.configService.get<string>(
      'WHATSAPP_OTP_TEMPLATE_LANGUAGE',
      'en',
    );
    const buttonType = (this.configService.get<string>(
      'WHATSAPP_OTP_BUTTON_TYPE',
      'none',
    ) || 'none') as WhatsappButtonType;

    const components: Record<string, unknown>[] = [
      {
        type: 'body',
        parameters: [{ type: 'text', text: otp }],
      },
    ];

    if (buttonType === 'url') {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: otp }],
      });
    }

    if (buttonType === 'copy_code') {
      components.push({
        type: 'button',
        sub_type: 'copy_code',
        index: '0',
        parameters: [{ type: 'coupon_code', coupon_code: otp }],
      });
    }

    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    };
  }
}

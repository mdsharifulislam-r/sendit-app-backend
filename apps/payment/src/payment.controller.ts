import { Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook',
    description: 'Webhook',
  })
  async webhook(@Req() req: Request, @Res() res: Response) {
    return this.paymentService.handleWebhook(req, res)
  }
}

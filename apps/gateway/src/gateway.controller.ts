import { Controller, All, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { GatewayService } from './gateway.service';

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) { }

  /** ALB / ECS health check — must respond before the wildcard proxy */
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @All('*')
  async handleProxy(@Req() req: Request, @Res() res: Response) {
    await this.gatewayService.forward(req, res);
  }
}

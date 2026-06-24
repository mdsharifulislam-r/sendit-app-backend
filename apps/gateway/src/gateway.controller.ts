import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { GatewayService } from './gateway.service';


@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) { }

  @All('*')
  async handleProxy(@Req() req: Request, @Res() res: Response) {
    await this.gatewayService.forward(req, res);
  }
}

import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: process.env.SERVICE_NAME || 'app',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}

import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { DeviceService } from './device.service';
import { Auth } from 'utils/guards/auth.guard';
import { CurrentUser } from 'utils/decorators/user.decorator';

@Controller('device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) { }

  @Get('')
  @Auth()
  getLoginDevices(@CurrentUser() user: any, @Query() query: Record<string, any>) {
    return this.deviceService.getLoginDevices(user.id, query)
  }

  @Delete('logout-device/:deviceId')
  @Auth()
  logoutDevice(@Param('deviceId') deviceId: string, @CurrentUser() user: any) {
    return this.deviceService.logoutDevice(deviceId, user.id)
  }

  @Delete('remove-device/:deviceId')
  @Auth()
  removeDevice(@Param('deviceId') deviceId: string, @CurrentUser() user: any) {
    return this.deviceService.removeDevice(deviceId, user.id)
  }
}

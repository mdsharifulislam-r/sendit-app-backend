import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DisclaimerService } from './disclaimer.service';
import { CreateDisclaimerDto, GetDisclaimerByTypeDto } from './disclaimer.dto';
import sendResponse from 'utils/helper/sendResponse';
import { Auth } from 'utils/guards/auth.guard';
import { USER_ROLES } from 'utils/enums/user';
import { CurrentUser } from 'utils/decorators/user.decorator';

@Controller('disclaimer')
export class DisclaimerController {
  constructor(private readonly disclaimerService: DisclaimerService) { }

  @Post()
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  async createDisclaimer(@Body() createDisclaimerDto: CreateDisclaimerDto, @CurrentUser() user: any) {
    return await this.disclaimerService.createDisclaimer(createDisclaimerDto, user.id)
  }

  @Get()
  async getDisclaimerByType(@Query() getDisclaimerByTypeDto: GetDisclaimerByTypeDto) {
    const data = await this.disclaimerService.getDisclaimerByType(getDisclaimerByTypeDto.type)
    return sendResponse({
      statusCode: 200,
      success: true,
      message: 'Disclaimer fetched successfully',
      data,
    });
  }
}

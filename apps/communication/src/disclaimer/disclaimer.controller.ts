import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DisclaimerService } from './disclaimer.service';
import { CreateDisclaimerDto, GetDisclaimerByTypeDto } from './disclaimer.dto';
import sendResponse from 'utils/helper/sendResponse';

@Controller('disclaimer')
export class DisclaimerController {
  constructor(private readonly disclaimerService: DisclaimerService) { }

  @Post()
  async createDisclaimer(@Body() createDisclaimerDto: CreateDisclaimerDto) {
    return await this.disclaimerService.createDisclaimer(createDisclaimerDto)
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

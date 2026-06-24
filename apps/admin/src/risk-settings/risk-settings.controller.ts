import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RiskSettingsService } from './risk-settings.service';
import { Auth } from 'utils/guards/auth.guard';
import { USER_ROLES } from 'utils/enums/user';
import { ChangeStatusOfItemsDto, CreateRiskSettingsDto } from './risk-settings.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from 'utils/decorators/user.decorator';

@Controller('risk-settings')
export class RiskSettingsController {
  constructor(private readonly riskSettingsService: RiskSettingsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new risk setting' })
  @ApiResponse({ status: 201, description: 'Risk setting created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid risk setting data.' })
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  createRiskSettings(@Body() createRiskSettingsDto: CreateRiskSettingsDto, @CurrentUser() user: any) {
    return this.riskSettingsService.createRiskSettings(user.id, createRiskSettingsDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all risk settings' })
  @ApiResponse({ status: 200, description: 'Risk settings fetched successfully.' })
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getRiskSettings() {
    return this.riskSettingsService.getRiskSettings();
  }


  @Get('risky-items')
  @ApiOperation({ summary: 'Get all risky items' })
  @ApiResponse({ status: 200, description: 'Risky items fetched successfully.' })
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getAllRiskyItems(@Query() query: Record<string, any>) {
    return this.riskSettingsService.getAllRiskyItems(query);
  }


  @Patch('risky-items/:id/change-status')
  @ApiOperation({ summary: 'Change status of a risky item' })
  @ApiResponse({ status: 200, description: 'Risky item status changed successfully.' })
  @ApiResponse({ status: 404, description: 'Risky item not found.' })
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  changeStatusOfItems(@Param('id') id: string, @Body() data: ChangeStatusOfItemsDto, @CurrentUser() user: any) {
    return this.riskSettingsService.changeStatusOfItems(id, data.status, user.id);
  }
}

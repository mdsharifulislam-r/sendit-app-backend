import { Body, Controller, Get, Post } from '@nestjs/common';
import { PricingRulesService } from './pricing-rules.service';
import { Auth } from 'utils/guards/auth.guard';
import { CreatePricingRulesDto } from './pricing-rules.dto';
import { USER_ROLES } from 'utils/enums/user';
import { CurrentUser } from 'utils/decorators/user.decorator';

@Controller('pricing-rules')
export class PricingRulesController {
  constructor(private readonly pricingRulesService: PricingRulesService) { }

  @Post()
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  createPricingRules(@Body() createPricingRulesDto: CreatePricingRulesDto, @CurrentUser() user: any) {
    return this.pricingRulesService.createPricingRules(createPricingRulesDto, user.id)
  }

  @Get()
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getPricingRules() {
    return this.pricingRulesService.getPricingRules()
  }
}

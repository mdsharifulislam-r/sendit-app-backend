import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { Auth } from 'utils/guards/auth.guard';
import { USER_ROLES } from 'utils/enums/user';
import { CheckCouponDto, CreateCouponDto, UpdateCouponDto } from './coupon.dto';
import { CurrentUser } from 'utils/decorators/user.decorator';
import sendResponse from 'utils/helper/sendResponse';

@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) { }

  @Post()
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  createCoupon(@Body() createCouponDto: CreateCouponDto) {
    return this.couponService.createCoupon(createCouponDto)
  }

  @Get()
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getAllCoupons(@Query() query: Record<string, any>) {
    return this.couponService.getAllCoupons(query)
  }

  @Get('check')
  @Auth()
  async checkCoupon(@Query() query: CheckCouponDto, @CurrentUser() user: any) {
    const data = await this.couponService.checkIsAvailable(query.code, user.id, Number(query.amount as string))
    return sendResponse({
      message: 'Coupon checked successfully',
      success: true,
      statusCode: 200,
      data
    })
  }
  @Patch(':id')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  updateCoupon(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponService.updateCoupon(id, updateCouponDto)
  }

  @Delete(':id')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  deleteCoupon(@Param('id') id: string) {
    return this.couponService.deleteCoupon(id)
  }


}

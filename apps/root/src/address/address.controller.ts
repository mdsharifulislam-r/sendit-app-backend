import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { AddressService } from './address.service';
import { Auth } from 'utils/guards/auth.guard';
import { USER_ROLES } from 'utils/enums/user';
import { CreateAddressDto, UpdateAddressDto } from './address.dto';
import { CurrentUser } from 'utils/decorators/user.decorator';
import sendResponse from 'utils/helper/sendResponse';

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) { }

  @Post()
  @Auth()
  createAddress(@Body() payload: CreateAddressDto, @CurrentUser() user: any) {
    return this.addressService.createUserAddress(payload, user.id)
  }

  @Get()
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  async getAddresses(@CurrentUser() user: any, @Query() query: any) {
    const data = await this.addressService.getUserAddresses(user.id, query)
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: "Addresses fetched successfully",
      success: true,
      data: data.addresses,
      pagination: data.pagination
    })
  }

  @Patch(':id')
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  updateAddress(@Param("id") id: string, @Body() payload: UpdateAddressDto) {
    return this.addressService.updateAddress(id, payload)
  }

  @Delete(':id')
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  deleteAddress(@Param("id") id: string, @CurrentUser() user: any) {
    return this.addressService.deleteAddress(id)
  }
}

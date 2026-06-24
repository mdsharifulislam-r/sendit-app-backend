import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import sendResponse from 'utils/helper/sendResponse';
import { USER_ROLES } from 'utils/enums/user';
import { Auth } from 'utils/guards/auth.guard';
import { CurrentUser } from 'utils/decorators/user.decorator';
import { CancelTripDto, CreateAdminDto, UpdateAdminDto } from './admin.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Post()
  @Auth(USER_ROLES.SUPER_ADMIN)
  createAdmin(@Body() body: CreateAdminDto, @CurrentUser() user: any) {
    return this.adminService.createAdmin(body, user.id)
  }

  @Patch('edit/:id')
  @Auth(USER_ROLES.SUPER_ADMIN)
  updateAdmin(@Param('id') id: string, @Body() body: UpdateAdminDto, @CurrentUser() user: any) {
    return this.adminService.updateAdmin(id, body, user.id)
  }

  @Get()
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getAdmins(@Query() query: Record<string, any>) {
    return this.adminService.getAllAdmins(query)
  }







  @Get('users')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getUsers(@Query() query: Record<string, any>) {
    return this.adminService.getUserList(query)
  }

  @Get('users/:id')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getUser(@Param('id') id: string) {
    return this.adminService.getUserUsingId(id)
  }

  @Patch('users/:id/suspend')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  suspendUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.suspendUser(id, user.id)
  }

  @Patch('users/:id/approve-kyc')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  approveKyc(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.approveKycVerification(id, user.id)
  }

  @Delete('trips/:id/cancel')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  cancelTrip(@Param('id') id: string, @CurrentUser() user: any, @Body() body: CancelTripDto) {
    return this.adminService.cancelTrip(id, user.id, body.reason)
  }

  @Get('trips')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getAllTrips(@Query() query: Record<string, any>) {
    return this.adminService.getAllTrips(query)
  }

  @Get('trips/:id')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getTripDetails(@Param('id') id: string) {
    return this.adminService.getTripDetails(id)
  }


  @Get('transactions')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getAllTransactions(@Query() query: Record<string, any>) {
    return this.adminService.getAllTransactions(query)
  }

  @Get('transactions/statics')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getTransactionStatics() {
    return this.adminService.getTransactionStatics()
  }

  @Get('transactions/:id')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  getSingleTransaction(@Param('id') id: string) {
    return this.adminService.getSingleTransaction(id)
  }


}

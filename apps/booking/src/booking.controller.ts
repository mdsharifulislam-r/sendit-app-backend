import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CancelBookingDto, ChangeBookingStatusDto, CreateBookingDto, DeliveryConfirmationDto, GetEarningsAndClientAmount, PickupConditionDto, PlaceBookingDto } from './booking.dto';
import { FileUpload } from 'utils/decorators/file-uploader.decorator';
import { GetFile } from 'utils/decorators/get-file.decorator';
import { Auth } from 'utils/guards/auth.guard';
import { USER_ROLES } from 'utils/enums/user';
import { CurrentUser } from 'utils/decorators/user.decorator';

import { CacheService } from 'utils/helper-modules/cache/cache.service';
import sendResponse from 'utils/helper/sendResponse';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService,
  ) { }

  @Post('create-booking-session')
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  @FileUpload({
    fields: [
      {
        fieldName: 'exterior_images',
        maxCount: 10,
      },
      {
        fieldName: 'interior_images',
        maxCount: 10,
      }
    ]
  })
  saveBookingSession(@Body() data: CreateBookingDto, @GetFile() files: any, @CurrentUser() user: any) {
    return this.bookingService.saveSession(data, user.id, files);
  }

  @Post('place-booking')
  @Auth(USER_ROLES.TRAVELER)
  placeBooking(@Body() data: PlaceBookingDto, @CurrentUser() user: any) {
    console.log(data)
    return this.bookingService.placeBookingByDirectPayment(user.id, data.session_id, data.trip_id, data?.coupon_code);
  }


  @Get('booking-requests')
  @Auth()
  async getBookingRequest(@CurrentUser() user: any, @Query() query: any) {
    const data = await this.bookingService.getBookingRequest(user.id, query) as any
    return sendResponse({
      message: 'Get All Booking Request',
      data: data.bookings,
      success: true,
      statusCode: 200,
      pagination: data.pagination

    })
  }


  @Patch('booking-request/status/:bookingId')
  @Auth()
  async updateBookingStatus(@Param('bookingId') bookingId: string, @Body() data: ChangeBookingStatusDto, @CurrentUser() user: any) {
    const res = await this.bookingService.acceptOrRejectBooking(user.id, bookingId, data.status, data?.rejection_reason)
    return sendResponse({
      message: 'Update Booking Status',
      success: true,
      statusCode: 200,

    })
  }

  @Post('pickup-percel/:bookingId')
  @Auth()
  @FileUpload({
    fields: [
      {
        fieldName: 'proof_image',
        maxCount: 1,
      },
      {
        fieldName: 'damage_image',
        maxCount: 1,
      }
    ]
  })
  pickupPercel(@Param('bookingId') bookingId: string, @Body() data: PickupConditionDto, @GetFile('proof_image') proof_image: any, @GetFile('damage_image') damage_image: any, @CurrentUser() user: any) {
    data.damage_image = damage_image?.[0]
    data.proof_image = proof_image?.[0]
    console.log('🚀 ~ BookingController ~ pickupPercel ~ data:', data)
    return this.bookingService.pickupPercel(bookingId, user.id, data)
  }

  @Post('transit-percel/:bookingId')
  @Auth()
  transitPercel(@Param('bookingId') bookingId: string, @CurrentUser() user: any) {
    return this.bookingService.transitPercel(bookingId, user.id)
  }


  @Post('deliver-percel/:bookingId')
  @Auth()
  @FileUpload({
    fields: [
      {
        fieldName: 'proof_image',
        maxCount: 1,
      },
      {
        fieldName: 'damage_image',
        maxCount: 1,
      },
      {
        fieldName: 'recipient_signature',
        maxCount: 1,
      }
    ]
  })
  deliverPercel(@Param('bookingId') bookingId: string, @Body() data: DeliveryConfirmationDto, @GetFile('proof_image') proof_image: any, @GetFile('damage_image') damage_image: any, @GetFile('recipient_signature') recipient_signature: any, @CurrentUser() user: any) {
    data.damage_image = damage_image?.[0]
    data.proof_image = proof_image?.[0]
    data.recipient_signature = recipient_signature?.[0]
    console.log('🚀 ~ BookingController ~ deliverPercel ~ data:', data)
    return this.bookingService.markAsDeliverdParcel(bookingId, user.id, data)
  }


  @Get('my-parcels')
  @Auth()
  async getMyParcel(@CurrentUser() user: any, @Query() query: any) {
    const data = await this.bookingService.getMyParcel(user.id, query) as any
    return sendResponse({
      message: 'Get All My Parcel',
      data: data.bookings,
      success: true,
      statusCode: 200,
      pagination: data.pagination
    })
  }

  @Delete('cancel-booking/:bookingId')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Cancel booking',
    description: 'Cancel booking',
  })
  async cancelBooking(@Param('bookingId') bookingId: string, @Body() data: CancelBookingDto, @CurrentUser() user: any) {
    return await this.bookingService.cancelBooking(bookingId, user.id, data)
  }


  @Get('details/:bookingId')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get single booking details',
    description: 'Get single booking details',
  })
  async getSingleBookingDetails(@Param('bookingId') bookingId: string, @CurrentUser() user: any) {
    const res = await this.bookingService.getSingleBookingDetails(bookingId, user.id)
    return sendResponse({
      message: 'Get Single Booking Details',
      success: true,
      statusCode: 200,
      data: res
    })
  }

  @Get('status-change-by-qr/:bookingId')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Change booking status by qr code',
    description: 'Change booking status by qr code',
  })
  scanSingleBookingQrCode(@CurrentUser() user: any, @Param('bookingId') bookingId: string) {
    return this.bookingService.changeStatusByqrcode(bookingId, user.id)
  }

}

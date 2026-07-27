import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { TripService } from './trip.service';
import { CancelTripDto, CreateTripDto, EditTripDto, SearchTripDto, TempTripDto } from './trip.dto';
import { CurrentUser } from 'utils/decorators/user.decorator';
import { Auth } from 'utils/guards/auth.guard';
import { USER_ROLES } from 'utils/enums/user';
import { ParseJsonPipe } from 'utils/pipes/parse-json-pipe';
import { FileUpload } from 'utils/decorators/file-uploader.decorator';
import { CreateBookingDto } from 'apps/booking/src/booking.dto';
import { GetFile } from 'utils/decorators/get-file.decorator';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { ApiError } from 'utils/errors/api-error';
import sendResponse from 'utils/helper/sendResponse';

@Controller('trip')
export class TripController {
  constructor(private readonly tripService: TripService, private readonly cacheService: CacheService) { }

  @Get('health')
  health() {
    return { status: 'ok', service: 'trip', timestamp: new Date().toISOString(), uptime: process.uptime() };
  }

  @Post()
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  @FileUpload({
    fieldName: "ticket_image"
  })
  createTrip(@Body() createTripDto: TempTripDto, @CurrentUser() user: any) {
    const data = JSON.parse(createTripDto.data);
    return this.tripService.create(data as any, user.id);
  }

  @Get()
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  getUserTrips(@CurrentUser() user: any, @Query() query: { page: string, limit: string, searchTerm: string }) {
    return this.tripService.getUserTrips(user.id, query);
  }

  @Get('search')
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)

  async searchTripes(@Query() data: SearchTripDto, @CurrentUser() user: any) {

    const sessionId = data.session_id

    const formatData = await this.cacheService.get(`booking_session:${sessionId}`) as any
    if (!formatData) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'session not found')
    }




    return this.tripService.searchTrips({
      lat: formatData.pickup_location?.latitude || formatData.pickup_location?.lat,
      lng: formatData.pickup_location?.longitude || formatData.pickup_location?.lng,
      radiusKm: data?.radiusKm ? Number(data?.radiusKm) : 1000,
      returnLat: formatData.dropoff_location?.latitude || formatData.dropoff_location?.lat,
      returnLng: formatData.dropoff_location?.longitude || formatData.dropoff_location?.lng,
      minWeight: formatData.weight,
      session_id: sessionId,
      page: Number(data?.page) || 1,
      limit: Number(data?.limit) || 10,
      search: data?.search,
      allowStops: Boolean(data?.allowStops),
      minPrice: data?.minPrice ? Number(data?.minPrice) : undefined,
      maxPrice: data?.maxPrice ? Number(data?.maxPrice) : undefined,
      departureDate: data?.departureDate,
      directOnly: Boolean(data?.directOnly),
      currency: data?.currency,

    })
  }

  @Get("recent-searches")
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  getRecentSearches(@CurrentUser() user: any, @Query() query: any) {
    return this.tripService.getUserRecentSearch(user.id, query)
  }


  @Get('upcomming')
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  async getUpcommingTrips(@CurrentUser() user: any, @Query() query: any) {
    const data = await this.tripService.getUpcommingTrips(user.id, query) as any
    return sendResponse({
      statusCode: HttpStatus.OK,
      data: data.data,
      success: true,
      message: 'Upcomming trips fetched successfully',
      pagination: data.pagination
    })
  }

  @Get('todays')
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  async getTodaysTrips(@CurrentUser() user: any, @Query() query: any) {
    const data = await this.tripService.getTodaysTrips(user.id, query) as any
    return sendResponse({
      statusCode: HttpStatus.OK,
      data: data.data,
      success: true,
      message: 'Todays trips fetched successfully',
      pagination: data.pagination
    })
  }

  @Get(":id")
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  async getSingleTrip(@Param("id") id: string, @Query('session_id') session_id: string,
    @CurrentUser() user: any
  ) {
    return sendResponse({
      statusCode: HttpStatus.OK,
      data: await this.tripService.getSingleTripDetails(id, session_id, user.id),
      success: true,
      message: 'Trip details fetched successfully',
    });
  }

  @Patch('complete/:id')
  @Auth()
  completeTrip(@Param("id") id: string, @CurrentUser() user: any) {
    return this.tripService.completeTrip(id, user.id)
  }

  @Patch(':id')
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  @FileUpload({
    fieldName: "ticket_image"
  })
  editTrip(@Param("id") id: string, @Body() body: TempTripDto) {
    const data = JSON.parse(body.data)
    return this.tripService.editTripDetails(id, data)
  }

  @Delete(':id')
  @Auth(USER_ROLES.TRANSPORTER, USER_ROLES.TRAVELER)
  cancelTrip(@Param("id") id: string, @Body() body: CancelTripDto) {
    return this.tripService.cancelTrip(id, body.cancel_reason)
  }

}



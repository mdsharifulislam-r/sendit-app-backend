import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Trip, TripDocument } from './trip.entity';
import { Model } from 'mongoose';
import { CreateTripDto, EditTripDto, SearchTripDto, TRIP_STATUS } from './trip.dto';
import sendResponse from 'utils/helper/sendResponse';
import { CreateNotificationDto, FilePathType } from 'apps/communication/src/communication.dto';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { ApiError } from 'utils/errors/api-error';
import { BOOKING_STATUS, CreateBookingDto } from 'apps/booking/src/booking.dto';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { StopDetails, StopDetailsDocument } from './stop.entity';
import { TransportAgreementService } from 'apps/root/src/transport-agreement/transport-agreement.service';
import { User, UserDocument } from 'apps/root/src/user/user.entity';
import { Booking } from 'apps/booking/src/booking.entity';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { CreateAuditLogsDto } from 'apps/admin/src/audit-logs/audit-logs.dto';
import { RiskSettings, RiskSettingsDocument } from 'apps/admin/src/risk-settings/risk-settings.entity';
import { CreateRiskyItems, RISK_ITEM_TYPE, RISKY_ITEM_STATUS } from 'apps/admin/src/risk-settings/risk-settings.dto';

@Injectable()
export class TripService {
  constructor(
    @InjectModel(Trip.name)
    private tripModel: Model<TripDocument>,
    @InjectModel(StopDetails.name)
    private stopDetailsModel: Model<StopDetailsDocument>,
    @InjectModel(Booking.name)
    private bookingModel: Model<Booking>,
    private snsService: SnsService,
    private cacheService: CacheService,
    private transportAgreementService: TransportAgreementService,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(RiskSettings.name)
    private riskSettingModel: Model<RiskSettingsDocument>,
  ) { }

  async create(createTripDto: CreateTripDto, userId: string) {

    const agreement = await this.transportAgreementService.checkAgreement(userId)

    if (!agreement) {
      return sendResponse({
        statusCode: HttpStatus.BAD_REQUEST,
        data: {
          error: 'You have no agreement, please create one first',
          error_code: 'NO_AGREEMENT',
        },
        success: false,
        message: 'You have no agreement, please create one first',
      });
    }

    const isKycVerified = await this.userModel.findById(userId, { isKycVerified: 1 })

    if (!isKycVerified?.isKycVerified) {
      return sendResponse({
        statusCode: HttpStatus.BAD_REQUEST,
        data: {
          error: 'Your Kyc is not verified, please verify your kyc first',
          error_code: 'KYC_NOT_VERIFIED',
        },
        success: false,
        message: 'Your Kyc is not verified, please verify your kyc first',
      });
    }



    const stops = await Promise.all(
      (createTripDto?.stops || []).map(async (stop) => {
        const stopDoc = new this.stopDetailsModel({
          id: `stop-${Math.random().toString(36).substr(2, 9)}`,
          address: stop.address,
          location: {
            type: 'Point',
            coordinates: [stop.location[0], stop.location[1]],
          },
          date: new Date(),
        });
        const saved = await stopDoc.save();
        return saved._id;
      })
    );

    const trip = new this.tripModel({
      ...createTripDto,
      id: `trip-${Math.random().toString(36).substr(2, 9)}`,
      user: userId,
      departure_location: {
        type: 'Point',
        coordinates: [createTripDto.departure_location[0], createTripDto.departure_location[1]],
      },
      return_location: createTripDto.return_location
        ? { type: 'Point', coordinates: [createTripDto.return_location[0], createTripDto.return_location[1]] }
        : undefined,
      stops,
    });

    const data = await trip.save();
    this.snsService.publish<CreateNotificationDto>('notification.send', {
      title: 'Trip Published',
      message: 'Your trip publish successfully',
      receiver: [userId],
      filePath: FilePathType.TRIP,
      referenceId: data.id,
      isRead: false
    });

    this.snsService.publish<CreateAuditLogsDto>('audit.create', {
      action: 'Trip Publish',
      user: userId as any,
      old_value: '',
      new_value: '',
      reason: ''
    });

    this.transportAgreementService.deleteOneTimeTripAgreement(userId)
    await Promise.all([
      this.cacheService.deleteByPattern('trip_search'),
      this.cacheService.deleteByPattern(`todays_trips:${userId}`),
      this.cacheService.deleteByPattern(`upcomming_trips:${userId}`),
      this.userModel.updateOne({ _id: userId }, { $inc: { trip_count: 1 } }),
    ]);

    const riskSetting = await this.riskSettingModel.findOne({}, { auto_flag_weight_threshold: 1 })

    if (riskSetting?.auto_flag_weight_threshold) {

      const weight = createTripDto.available_space_kg

      if (weight > riskSetting?.auto_flag_weight_threshold) {
        this.snsService.publish<CreateRiskyItems>('risk.item.create', {
          type: RISK_ITEM_TYPE.TRIP,
          item: data._id,
          description: `Trip weight (${weight}kg) is greater than threshold (${riskSetting?.auto_flag_weight_threshold}kg)`,
          status: RISKY_ITEM_STATUS.PENDNIG
        })
      }

    }



    return sendResponse({
      statusCode: HttpStatus.CREATED,
      data,
      success: true,
      message: 'Trip created successfully',
    });
  }

  async getUserTrips(userId: string, query: { page: string, limit: string, searchTerm: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: any = { user: userId };

    const [trips, total] = await Promise.all([
      this.tripModel
        .find(filter)
        .populate({ path: 'stops' })
        .populate({ path: 'user', select: 'id name email image' })
        .select('id departure_address return_address departure_date return_date stops user departure_location return_location carry_type pricing_details transport_type created_at')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      this.tripModel.countDocuments(filter),
    ]);

    return sendResponse({
      statusCode: HttpStatus.OK,
      data: trips,
      success: true,
      message: 'User trips fetched successfully',
      pagination: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      }
    });
  }

  async searchTrips(query: SearchTripDto) {
    const {
      search,
      lat,
      lng,
      radiusKm = 50,
      minPrice,
      maxPrice,
      minWeight,
      maxWeight,
      departureDate,
      directOnly,
      allowStops,
      transportType,
      returnLat,
      returnLng,
      page = 1,
      limit = 10,
      session_id,
      currency,
    } = query;

    const cache = (await this.cacheService.get(
      `trip_search:${session_id}`,
      query,
    )) as any;

    if (cache) {
      return sendResponse({
        statusCode: HttpStatus.OK,
        success: true,
        message: 'Trip search results fetched successfully',
        data: cache.data,
        pagination: cache.pagination,
      });
    }

    const skip = (page - 1) * limit;

    const filter: any = {
      status: TRIP_STATUS.PUBLISHED,
    };

    /**
     * SEARCH
     */
    if (search) {
      filter.$or = [
        {
          departure_address: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          return_address: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    }

    /**
     * DEPARTURE LOCATION
     * Uses $near (only ONE geoNear expression is allowed)
     */
    if (lat != null && lng != null) {
      filter.departure_location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: Number(radiusKm) * 1000,
        },
      };
    }

    /**
     * RETURN LOCATION
     * Uses $geoWithin
     */
    if (returnLat != null && returnLng != null) {
      filter.return_location = {
        $geoWithin: {
          $centerSphere: [
            [Number(returnLng), Number(returnLat)],
            Number(radiusKm) / 6378.1,
          ],
        },
      };
    }

    /**
     * PRICE
     */
    if (minPrice != null || maxPrice != null) {
      filter['pricing_details.price_per_kg'] = {};

      if (minPrice != null) {
        filter['pricing_details.price_per_kg'].$gte = Number(minPrice);
      }

      if (maxPrice != null) {
        filter['pricing_details.price_per_kg'].$lte = Number(maxPrice);
      }
    }

    /**
     * WEIGHT
     */
    if (minWeight != null || maxWeight != null) {
      filter.available_space_kg = {};

      if (minWeight != null) {
        filter.available_space_kg.$gte = Number(minWeight);
      }

      if (maxWeight != null) {
        filter.available_space_kg.$lte = Number(maxWeight);
      }
    }

    /**
     * DATE
     */
    if (departureDate) {
      const start = new Date(departureDate);

      const end = new Date(departureDate);
      end.setDate(end.getDate() + 1);

      filter.departure_date = {
        $gte: start,
        $lt: end,
      };
    }

    /**
     * DIRECT
     */
    if (directOnly) {
      filter.stops = { $size: 0 };
    }

    /**
     * WITH STOPS
     */
    if (allowStops) {
      filter['stops.0'] = { $exists: true };
    }

    /**
     * TRANSPORT
     */
    if (transportType) {
      filter.transport_type = transportType;
    }

    /**
     * CURRENCY
     */
    if (currency) {
      filter['pricing_details.currency'] = currency;
    }

    const sortOption: any =
      lat != null && lng != null
        ? {}
        : {
          createdAt: -1,
        };

    const countFilter = { ...filter };
    if (lat != null && lng != null) {
      countFilter.departure_location = {
        $geoWithin: {
          $centerSphere: [
            [Number(lng), Number(lat)],
            Number(radiusKm) / 6378.1,
          ],
        },
      };
    }

    const [entities, total] = await Promise.all([
      this.tripModel
        .find(filter)
        .populate({
          path: 'user',
          select: 'id name image',
        })
        .populate({
          path: 'stops',
          select: 'id address date location',
        })
        .select(
          'id departure_address return_address departure_date return_date transport_type available_space_kg pricing_details departure_location return_location createdAt',
        )
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),

      this.tripModel.countDocuments(countFilter),
    ]);

    const formatted = entities.map((trip: any) => ({
      ...trip,
      estimated_price:
        trip.pricing_details?.price_per_kg && minWeight
          ? trip.pricing_details.price_per_kg * Number(minWeight)
          : null,
      session_id: session_id ?? null,
    }));

    const pagination = {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / limit),
    };

    await this.cacheService.set(
      `trip_search:${session_id}`,
      {
        data: formatted,
        pagination,
      },
      120,
      query,
    );

    return sendResponse({
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Trips fetched successfully',
      data: formatted,
      pagination,
    });
  }

  async getSingleTripDetails(id: string, session_id?: string, userId?: string) {
    const cache = await this.cacheService.get(`trip_details:${id}`, { session_id }) as any;
    if (cache) {
      return cache.data;
    }

    let session: CreateBookingDto | null = null;
    if (session_id) {
      session = await this.cacheService.get(`booking_session:${session_id}`) as CreateBookingDto;
    }

    const trip = await this.tripModel
      .findOne({ id })
      .populate({ path: 'user', select: 'id name image' })
      .populate({ path: 'stops' })
      .select('id departure_address return_address departure_date return_date departure_location return_location pricing_details available_space_kg created_at transport_type vehicle_details carry_type trip_description trip_rules');


    const formatted = {
      ...trip?.toObject(),
      estimated_price: trip?.pricing_details?.price_per_kg && session?.weight ? trip.pricing_details.price_per_kg * session.weight : null,
      session_id: session_id || null
    };

    if (session_id && userId) {
      this.saveRecentTripSearch(userId, trip?._id?.toString()!)
    }

    this.cacheService.set(`trip_details:${id}`, { data: formatted }, 60 * 2, { session_id });

    return formatted;
  }

  async editTripDetails(id: string, payload: CreateTripDto) {
    const trip = await this.tripModel.findOne({ _id: id })
    if (!trip) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Trip not found')
    }

    if (payload.stops.length > 0) {
      await this.stopDetailsModel.deleteMany({ trip: id })
      const stops = await Promise.all(
        payload.stops.map(async (stop: any) => {
          const stopData = await this.stopDetailsModel.create({ ...stop, trip: id, location: { type: 'Point', coordinates: [stop.location[0], stop.location[1]] } });
          return stopData._id
        }),
      );
      payload.stops = stops as any;
    }

    if (payload.departure_location) {
      payload.departure_location = {
        type: "Point",
        coordinates: [payload.departure_location[0], payload.departure_location[1]]
      } as any
    }

    if (payload.return_location) {
      payload.return_location = {
        type: "Point",
        coordinates: [payload.return_location[0], payload.return_location[1]]
      } as any
    }

    const updatedTrip = await this.tripModel.findByIdAndUpdate(id, payload, { new: true })

    await this.cacheService.deleteByPattern(`trip_details:${id}`)
    await this.cacheService.deleteByPattern('trip_search')


    return sendResponse({
      statusCode: 200,
      success: true,
      message: "Trip updated successfully",
      data: updatedTrip,
    });

  }

  async cancelTrip(id: string, cancelReason: string,) {
    const trip = await this.tripModel.findOne({ _id: id })
    if (!trip) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Trip not found')
    }

    if (trip.status == TRIP_STATUS.CANCELLED) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'Trip already cancelled')
    }

    const activeBooking = await this.bookingModel.countDocuments({ trip: id, status: BOOKING_STATUS.CONFIRMED })

    if (activeBooking > 0) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'Trip has active bookings!! cancel all bookings and try again.')
    }

    trip.status = TRIP_STATUS.CANCELLED
    trip.cancellation_reason = cancelReason
    await trip.save()

    await this.cacheService.deleteByPattern(`trip_details:${id}`)
    await this.cacheService.deleteByPattern('trip_search')
    await this.userModel.updateOne({ _id: trip.user }, { $inc: { trip_count: -1 } })

    return sendResponse({
      statusCode: 200,
      success: true,
      message: "Trip cancelled successfully",
      data: trip,
    });
  }

  async saveRecentTripSearch(user: string, tripId: string) {
    const isExit = await this.cacheService.get(`recent_search:${user}`) as any as string[]

    if (isExit?.length) {
      const hasInExist = isExit.includes(tripId)
      if (hasInExist) {
        return true
      }
      isExit.unshift(tripId)
      await this.cacheService.set(`recent_search:${user}`, isExit, 60 * 60 * 24)
      return true
    }
    await this.cacheService.set(`recent_search:${user}`, [tripId], 60 * 60 * 24)
    return true
  }

  async getUserRecentSearch(user: string, query: Record<string, any>) {
    const cache = await this.cacheService.get(`recent_search:${user}`) as any as string[] || []

    const tripQuery = new QueryBuilder(this.tripModel.find({ _id: { $in: cache } }, { _id: 1, id: 1, departure_address: 1, return_address: 1, createdAt: 1 }), query).paginate()

    const [data, pagination] = await Promise.all([
      tripQuery.modelQuery.lean(),
      tripQuery.getPaginationInfo()
    ])

    return sendResponse({
      statusCode: 200,
      success: true,
      message: "Your recent searches fetched successfully",
      data: data,
      pagination
    });
  }

  async getTodaysTrips(user: string, query: Record<string, any>) {
    const cache = await this.cacheService.get(`todays_trips:${user}`)
    if (cache) return cache

    const todayStartTime = new Date(new Date().setHours(0, 0, 0, 0))
    const todayEndTime = new Date(new Date().setHours(23, 59, 59, 999))

    const filter = {
      user,
      status: TRIP_STATUS.PUBLISHED,
      departure_date: { $gte: todayStartTime, $lte: todayEndTime },

    }

    const tripQuery = new QueryBuilder(this.tripModel.find(filter, { _id: 1, id: 1, departure_address: 1, return_address: 1, departure_date: 1, return_date: 1, createdAt: 1 }), query).paginate().sort()
    const [data, pagination] = await Promise.all([
      tripQuery.modelQuery.lean(),
      tripQuery.getPaginationInfo()
    ])

    await this.cacheService.set(`todays_trips:${user}`, { data, pagination }, 60 * 60)

    return {
      data,
      pagination
    }
  }


  async getUpcommingTrips(user: string, query: Record<string, any>) {
    const cache = await this.cacheService.get(`upcomming_trips:${user}`)
    if (cache) return cache
    const todayEndTime = new Date(new Date().setHours(23, 59, 59, 999))
    const filter = {
      user,
      status: TRIP_STATUS.PUBLISHED,
      departure_date: { $gte: todayEndTime },
    }

    const tripQuery = new QueryBuilder(this.tripModel.find(filter, { _id: 1, id: 1, departure_address: 1, return_address: 1, departure_date: 1, return_date: 1, createdAt: 1 }), query).paginate().sort()
    const [data, pagination] = await Promise.all([
      tripQuery.modelQuery.lean(),
      tripQuery.getPaginationInfo()
    ])

    await this.cacheService.set(`upcomming_trips:${user}`, { data, pagination }, 60 * 60)

    return {
      data,
      pagination
    }
  }


}

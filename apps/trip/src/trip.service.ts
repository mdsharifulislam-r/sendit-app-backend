import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Trip, TripDocument } from './trip.entity';
import { Model } from 'mongoose';
import { CreateTripDto, SearchTripDto } from './trip.dto';
import sendResponse from 'utils/helper/sendResponse';
import { CreateNotificationDto, FilePathType } from 'apps/communication/src/communication.dto';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { ApiError } from 'utils/errors/api-error';
import { CreateBookingDto } from 'apps/booking/src/booking.dto';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { StopDetails, StopDetailsDocument } from './stop.entity';
import { TransportAgreementService } from 'apps/root/src/transport-agreement/transport-agreement.service';
import { User, UserDocument } from 'apps/root/src/user/user.entity';

@Injectable()
export class TripService {
  constructor(
    @InjectModel(Trip.name)
    private tripModel: Model<TripDocument>,
    @InjectModel(StopDetails.name)
    private stopDetailsModel: Model<StopDetailsDocument>,
    private snsService: SnsService,
    private cacheService: CacheService,
    private transportAgreementService: TransportAgreementService,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>
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

    this.transportAgreementService.deleteOneTimeTripAgreement(userId)
    await this.cacheService.deleteByPattern('trip_search:*');
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
      currency
    } = query;

    const cache = await this.cacheService.get(`trip_search:${session_id}`, query) as any;
    if (cache) {
      return sendResponse({
        statusCode: HttpStatus.OK,
        data: cache.data,
        success: true,
        message: 'Trip search results fetched successfully',
        pagination: cache.pagination
      });
    }

    const skip = (page - 1) * limit;
    const filter: any = {};

    /**
     * SEARCH
     */
    if (search) {
      filter.$or = [
        { departure_address: { $regex: search, $options: 'i' } },
        { return_address: { $regex: search, $options: 'i' } },
      ];
    }

    /**
     * DEPARTURE LOCATION SEARCH
     */
    if (lat && lng) {
      filter.departure_location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radiusKm) * 1000,
        },
      };
    }

    /**
     * RETURN LOCATION SEARCH
     */
    if (returnLat && returnLng) {
      filter.return_location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(returnLng), Number(returnLat)] },
          $maxDistance: Number(radiusKm) * 1000,
        },
      };
    }

    /**
     * PRICE FILTER
     */
    if (minPrice !== undefined) {
      filter['pricing_details.price_per_kg'] = { ...filter['pricing_details.price_per_kg'], $gte: Number(minPrice) };
    }
    if (maxPrice !== undefined) {
      filter['pricing_details.price_per_kg'] = { ...filter['pricing_details.price_per_kg'], $lte: Number(maxPrice) };
    }

    /**
     * WEIGHT FILTER
     */
    if (minWeight !== undefined) {
      filter.available_space_kg = { ...filter.available_space_kg, $gte: Number(minWeight) };
    }
    if (maxWeight !== undefined) {
      filter.available_space_kg = { ...filter.available_space_kg, $lte: Number(maxWeight) };
    }

    /**
     * DATE FILTER
     */
    if (departureDate) {
      const start = new Date(departureDate);
      const end = new Date(departureDate);
      end.setDate(end.getDate() + 1);
      filter.departure_date = { $gte: start, $lt: end };
    }

    /**
     * DIRECT ONLY
     */
    if (directOnly) {
      filter.stops = { $size: 0 };
    }

    /**
     * ALLOW STOPS
     */
    if (allowStops) {
      filter['stops.0'] = { $exists: true };
    }

    /**
     * TRANSPORT TYPE
     */
    if (transportType) {
      filter.transport_type = transportType;
    }

    if (currency) {
      filter['pricing_details.currency'] = currency;
    }

    const sortOption: any = lat && lng ? {} : { created_at: -1 };

    const [entities, total] = await Promise.all([
      this.tripModel
        .find(filter)
        .populate({ path: 'user', select: 'id name image' })
        .populate({ path: 'stops', select: 'id address date location' })
        .select('id departure_address return_address departure_date return_date transport_type available_space_kg created_at pricing_details departure_location return_location')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      this.tripModel.countDocuments(filter),
    ]);

    const formatted = entities.map((trip: any) => ({
      ...trip.toObject(),
      estimated_price: trip.pricing_details?.price_per_kg && minWeight ? trip.pricing_details.price_per_kg * minWeight : null,
      session_id: query.session_id || null
    }));

    const pagination = {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    };

    this.cacheService.set(`trip_search:${session_id}`, { data: formatted, pagination }, 60 * 2, query);

    return sendResponse({
      statusCode: 200,
      success: true,
      message: "Trips fetched successfully",
      data: formatted,
      pagination
    });
  }

  async getSingleTripDetails(id: string, session_id?: string) {
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

    this.cacheService.set(`trip_details:${id}`, { data: formatted }, 60 * 2, { session_id });

    return formatted;
  }
}

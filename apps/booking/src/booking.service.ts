import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Wallet, WalletDocument } from 'apps/payment/src/wallet/wallet.entity';
import { Trip, TripDocument } from 'apps/trip/src/trip.entity';
import { Model, Connection, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiError } from 'utils/errors/api-error';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { S3Service } from 'utils/helper-modules/upload/s3.service';
import sendResponse from 'utils/helper/sendResponse';
import { BOOKING_STATUS, CancelBookingDto, CreateBookingDto, DeliveryConfirmationDto, PickupConditionDto, TIMELINE_TYPE } from './booking.dto';
import { Booking, BookingDocument } from './booking.entity';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateTransactionDto } from 'apps/payment/src/transaction/transaction.dto';
import { TRANSACTION_PAYMENT_TYPE, TRANSACTION_STATUS, TRANSACTION_TYPE } from 'apps/payment/src/transaction/transaction.entity';
import { CreateNotificationDto, FilePathType } from 'apps/communication/src/communication.dto';
import MongooseQueryBuilder from 'utils/queryBuilder/queryBuilder';
import { CouponService } from 'apps/payment/src/coupon/coupon.service';
import { PricingRulesService } from 'apps/payment/src/pricing-rules/pricing-rules.service';
import { getDatePeriodRange, Period } from 'utils/helper/dateHelper';
import { CreateAuditLogsDto } from 'apps/admin/src/audit-logs/audit-logs.dto';
import { StripeService } from 'utils/helper-modules/stripe/stripe.service';

@Injectable()
export class BookingService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly s3Service: S3Service,
    private readonly snsService: SnsService,
    private readonly couponService: CouponService,
    private readonly pricingRulesService: PricingRulesService,
    private readonly stripeService: StripeService,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(Trip.name) private readonly tripModel: Model<TripDocument>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
  ) { }


  async saveSession(data: any, userId: string, files?: any) {
    let formatData = { ...data } as any;
    try {
      formatData = {
        ...data,
        sender_information: typeof data.sender_information === 'string' ? JSON.parse(data.sender_information as any) : data.sender_information,
        receiver_information: typeof data.receiver_information === 'string' ? JSON.parse(data.receiver_information as any) : data.receiver_information,
        pickup_location: typeof data.pickup_location === 'string' ? JSON.parse(data.pickup_location as any) : data.pickup_location,
        dropoff_location: typeof data.dropoff_location === 'string' ? JSON.parse(data.dropoff_location as any) : data.dropoff_location,
        exterior_images: (await this.s3Service.uploadMultipleFiles(files.exterior_images)) || [],
        interior_images: (await this.s3Service.uploadMultipleFiles(files.interior_images)) || [],
      };
    } catch (error) {
      // Ignore JSON parse errors if already object
    }

    let sessionId = formatData.session_id || crypto.randomUUID();
    formatData.session_id = sessionId;
    await this.cacheService.set(`booking_session:${sessionId}`, formatData, 60 * 24);

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Session saved successfully',
      success: true,
      data: sessionId,
    });
  }


  async placeBookingByDirectPayment(userId: string, session_id: string, trip_id: string, coupon?: string) {
    const mongoSession = await this.connection.startSession();
    mongoSession.startTransaction();
    try {
      let session: CreateBookingDto | null = await this.cacheService.get(`booking_session:${session_id}`);

      for (let ses in session) {
        if (['dropoff_location', 'pickup_location', 'receiver_information', 'sender_information'].includes(ses)) {
          session[ses] = JSON.parse(session[ses] as any)
        }
      }

      if (!session) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'Session not found');
      }

      const trip = await this.tripModel
        .findOne({ id: trip_id })
        .select('pricing_details user')
        .populate({ path: 'user', select: 'id' })
        .session(mongoSession);
      if (!trip) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'Trip not found');
      }



      const total_price = trip.pricing_details.price_per_kg * session.weight;

      const calculatePricingFare = await this.pricingRulesService.calculatePricingFare(total_price)

      let discount = {} as any
      if (coupon) {
        discount = await this.couponService.checkIsAvailable(coupon, userId as any, total_price);
      }

      const stripeSession = await this.stripeService.getClient().checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Booking ${session_id}`,
              },
              unit_amount: Math.round(total_price * 100),
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Admin fee ${session_id}`,
              },
              unit_amount: Math.round(calculatePricingFare.platform_fee * 100),
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Tax`,
              },
              unit_amount: Math.round(calculatePricingFare.tax * 100),
            },
            quantity: 1,
          }
        ],
        discounts: [
          (coupon && discount.stripe_coupon_code && {
            coupon: discount.stripe_coupon_code
          })
        ],
        mode: 'payment',
        success_url: `http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:5173/payment-cancel`,
        metadata: {
          session_id,
          trip_id,
          coupon: coupon!,
          userId
        }
      });


      await mongoSession.commitTransaction();
      mongoSession.endSession();
      return sendResponse({
        statusCode: HttpStatus.OK,
        message: 'Booking placed successfully',
        success: true,
        data: stripeSession.url,
      });

    } catch (error) {
      console.log("🚀 ~ BookingService ~ placeBooking ~ error:", error);
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw error;
    }
  }


  async placeBooking(userId: string, session_id: string, trip_id: string, coupon?: string) {
    const mongoSession = await this.connection.startSession();
    mongoSession.startTransaction();
    try {
      let session: CreateBookingDto | null = await this.cacheService.get(`booking_session:${session_id}`);

      for (let ses in session) {
        if (['dropoff_location', 'pickup_location', 'receiver_information', 'sender_information'].includes(ses)) {
          session[ses] = JSON.parse(session[ses] as any)
        }
      }

      if (!session) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'Session not found');
      }

      const trip = await this.tripModel
        .findOne({ id: trip_id })
        .select('pricing_details user')
        .populate({ path: 'user', select: 'id' })
        .session(mongoSession);
      if (!trip) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'Trip not found');
      }



      const total_price = trip.pricing_details.price_per_kg * session.weight;




      let discount = {} as any
      if (coupon) {
        discount = await this.couponService.checkIsAvailable(coupon, userId as any, total_price);
      }

      const service_charge_object = await this.pricingRulesService.calculatePricingFare(total_price, discount?.discount_amount)




      const bookingId = `SNDB-BK-${Math.random().toString(36).substr(2, 9)}`;
      const booking = new this.bookingModel({
        id: bookingId,
        package_size: session.package_size,
        package_type: session.package_type,
        weight: session.weight,
        package_content: session.package_content,
        exterior_images: session.exterior_images,
        interior_images: session.interior_images,
        need_to_storage_untill_pickup: session.need_to_storage_untill_pickup as any == 'true',
        storage_start_date: session.storage_start_date,
        storage_end_date: session.storage_end_date,
        sender_information: session.sender_information,
        receiver_information: session.receiver_information,
        booking_preffernce: session.booking_preffernce,
        pickup_address: session.pickup_address,
        pickup_location: {
          type: 'Point',
          coordinates: [session.pickup_location.longitude, session.pickup_location.latitude],
        },
        dropoff_address: session.dropoff_address,
        dropoff_location: {
          type: 'Point',
          coordinates: [session.dropoff_location.longitude, session.dropoff_location.latitude],
        },
        delivery_speed: session.delivery_speed,
        sender: userId,
        receiver: session.receiver_id,
        trip: trip._id,
        price_breakdown: {
          subtotal: service_charge_object.subtotal,
          service_charge: service_charge_object.platform_fee,
          discount: service_charge_object.discount,
          tax: service_charge_object.tax,
          total: service_charge_object.total,
        },
        transporter: (trip.user as any)._id || (trip.user as any).id,
        timeline: [{ date: new Date(), status: TIMELINE_TYPE.BOOKED }],
      });

      const savedBooking = await booking.save({ session: mongoSession });

      await Promise.all([
        this.snsService.publish('transaction.created', {
          amount: service_charge_object.total,
          ownerId: userId,
          bookingId: savedBooking._id.toString(),
          title: `Charge for booking #${savedBooking.id}`,
          payment_status: TRANSACTION_PAYMENT_TYPE.DEBIT,
          type: TRANSACTION_TYPE.PAYMENT,
          platform_charge: service_charge_object.platform_fee,
          discount: service_charge_object.discount,
          tax: service_charge_object.tax,
          status: TRANSACTION_STATUS.COMPLETED,
        } as CreateTransactionDto),
        this.snsService.publish('notification.send', {
          title: `Booking #${savedBooking.id}`,
          message: `Booking #${savedBooking.id} placed successfully`,
          receiver: [userId],
          isRead: false,
          filePath: FilePathType.BOOKING,
          referenceId: savedBooking.id
        } as CreateNotificationDto),
        this.snsService.publish('notification.send', {
          title: `You got a new booking request`,
          message: `Booking #${savedBooking.id} has been placed by ${session.sender_information.name}`,
          receiver: [(trip.user as any)._id?.toString() || (trip.user as any).id],
          isRead: false,
          filePath: FilePathType.BOOKING,
          referenceId: savedBooking.id
        } as CreateNotificationDto),
        this.snsService.publish('qr.code.generate', { data: JSON.stringify({ id: savedBooking.id, date: new Date() }), id: savedBooking.id }),
        this.snsService.publish<CreateAuditLogsDto>("audit.create", {
          action: "Booking placed",
          user: userId as any,
          old_value: ``,
          new_value: ``,
          reason: "Booking placed"
        }),
      ]);

      if (coupon) {
        await this.snsService.publish('coupon.used', { code: coupon, userId: userId })
      }

      await this.cacheService.deleteByPattern(`booking_request:${booking.transporter}`)
      await this.cacheService.deleteByPattern(`my_parcel:${booking.sender._id}`)
      await mongoSession.commitTransaction();
      mongoSession.endSession();
      return sendResponse({
        statusCode: HttpStatus.OK,
        message: 'Booking placed successfully',
        success: true,
        data: savedBooking,
      });

    } catch (error) {
      console.log("🚀 ~ BookingService ~ placeBooking ~ error:", error);
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw error;
    }
  }



  async getBookingRequest(userId: string, query: Record<string, any>) {
    const cache = await this.cacheService.get(`booking_request:${userId}`, query);
    if (cache) {
      return cache;
    }

    const qb = new MongooseQueryBuilder(this.bookingModel.find({ transporter: new Types.ObjectId(userId) }), query)
      .paginate().sort('-created_at').search(['id']).filter()

    const [bookings, pagination] = await Promise.all([
      qb.modelQuery.populate('sender', 'name email image').lean(),
      qb.getPaginationInfo()
    ]);

    await this.cacheService.set(`booking_request:${userId}`, { bookings, pagination }, 60 * 60, query)
    return { bookings, pagination }
  }


  async acceptOrRejectBooking(userId: string, bookingId: string, status: BOOKING_STATUS, rejection_reason?: string) {
    const booking = await this.bookingModel.findOne({ _id: bookingId }).populate(['transporter', 'sender']).lean()

    if (!booking) {
      throw new ApiError(404, 'Booking not found')
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
      throw new ApiError(400, 'Booking is not in pending state')
    }

    if (booking.transporter._id.toString() != userId) {
      throw new ApiError(403, 'You are not authorized to update this booking')
    }


    if (status === BOOKING_STATUS.REJECTED && !rejection_reason) {
      throw new ApiError(400, 'Rejection reason is required')
    }

    if (status === BOOKING_STATUS.REJECTED) {
      await this.bookingModel.findByIdAndUpdate(booking._id, { status, rejection_reason: rejection_reason })
      await this.cacheService.deleteByPattern(`booking_request:${userId}`)
      await this.cacheService.deleteByPattern(`my_parcel:${booking.sender._id.toString()}`)
      const res = await this.walletModel.findOneAndUpdate({ user: booking.sender._id }, { $inc: { balance: booking.price_breakdown.total * 100 } });
      this.snsService.publish('notification.send', {
        title: `Booking #${booking.id}`,
        message: `Booking #${booking.id} has been rejected by ${(booking.transporter as any)?.name}`,
        receiver: [booking.sender._id.toString()],
        isRead: false,
        filePath: FilePathType.BOOKING,
        referenceId: booking.id
      } as CreateNotificationDto)

      await this.snsService.publish<CreateAuditLogsDto>("audit.create", {
        action: `Booking #${booking.id} rejected`,
        user: userId as any,
        old_value: booking.status,
        new_value: status,
        reason: rejection_reason!
      });

      return sendResponse({
        statusCode: HttpStatus.OK,
        message: 'Booking rejected successfully',
        success: true,
        data: booking,
      });
    }

    if (status === BOOKING_STATUS.CONFIRMED) {
      await this.bookingModel.findByIdAndUpdate(booking._id, { status, current_stage: TIMELINE_TYPE.BOOKED })
      await this.cacheService.deleteByPattern(`booking_request:${userId}`)
      await this.cacheService.deleteByPattern(`my_parcel:${booking.sender._id.toString()}`)
      this.snsService.publish('notification.send', {
        title: `Booking #${booking.id}`,
        message: `Booking #${booking.id} has been confirmed by ${(booking.transporter as any)?.name}`,
        receiver: [booking.sender._id.toString()],
        isRead: false,
        filePath: FilePathType.BOOKING,
        referenceId: booking.id
      } as CreateNotificationDto)

      this.snsService.publish<CreateAuditLogsDto>("audit.create", {
        action: `Booking #${booking.id} confirmed`,
        user: userId as any,
        old_value: booking.status,
        new_value: status,
        reason: "Booking confirmed"
      });

      return sendResponse({
        statusCode: HttpStatus.OK,
        message: 'Booking status updated successfully',
        success: true,
        data: booking,
      });
    }
  }


  async pickupPercel(bookingId: string, userId: string, body: PickupConditionDto) {
    const booking = await this.bookingModel.findById(bookingId).populate(['transporter', 'sender']).lean()


    if (!booking) {
      throw new ApiError(404, 'Booking not found')
    }

    if (booking.transporter._id.toString() !== userId) {
      throw new ApiError(403, 'You are not authorized to update this booking')
    }

    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      throw new ApiError(400, 'Your booking is not confirmed yet')
    }

    if (booking.current_stage !== TIMELINE_TYPE.BOOKED) {
      throw new ApiError(400, 'Your booking is not in booked state')
    }

    if (body.proof_image) {
      const uploadedImage = await this.s3Service.uploadFile(body.proof_image)
      body.proof_image = uploadedImage?.url
    }

    if (body.damage_image) {
      const uploadedImage = await this.s3Service.uploadFile(body.damage_image)
      body.damage_image = uploadedImage?.url
    }

    await this.bookingModel.findByIdAndUpdate(booking._id, { pickup_condition: body, current_stage: TIMELINE_TYPE.PICKED_UP, $addToSet: { timeline: { date: new Date(), status: TIMELINE_TYPE.PICKED_UP } } })
    await this.cacheService.deleteByPattern(`booking_request:${userId}`)
    await this.cacheService.deleteByPattern(`my_parcel:${booking.sender._id.toString()}`)
    await this.snsService.publish('notification.send', {
      title: `Booking #${booking.id}`,
      message: `Booking #${booking.id} has been picked up by ${(booking.transporter as any)?.name}`,
      receiver: [booking.sender._id.toString()],
      isRead: false,
      filePath: FilePathType.BOOKING,
      referenceId: booking.id
    } as CreateNotificationDto)

    this.snsService.publish<CreateAuditLogsDto>("audit.create", {
      action: `Booking #${booking.id} picked up`,
      user: userId as any,
      old_value: booking.current_stage,
      new_value: TIMELINE_TYPE.PICKED_UP,
      reason: "Booking picked up"
    });

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Booking picked up successfully',
      success: true,
      data: booking,
    });
  }

  async transitPercel(bookingId: string, userId: string) {
    const booking = await this.bookingModel.findById(bookingId).populate(['transporter', 'sender']).lean()


    if (!booking) {
      throw new ApiError(404, 'Booking not found')
    }

    if (booking.transporter._id.toString() !== userId) {
      throw new ApiError(403, 'You are not authorized to update this booking')
    }

    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      throw new ApiError(400, 'Your booking is not confirmed yet')
    }

    if (booking.current_stage !== TIMELINE_TYPE.PICKED_UP) {
      throw new ApiError(400, 'Your booking is not in picked up state')
    }

    await this.bookingModel.findByIdAndUpdate(booking._id, { current_stage: TIMELINE_TYPE.IN_TRANSIT, $addToSet: { timeline: { date: new Date(), status: TIMELINE_TYPE.IN_TRANSIT } } })
    await this.cacheService.deleteByPattern(`booking_request:${userId}`)
    await this.cacheService.deleteByPattern(`my_parcel:${booking.sender._id.toString()}`)
    await this.snsService.publish('notification.send', {
      title: `Booking #${booking.id}`,
      message: `Booking #${booking.id} has been in transit by ${(booking.transporter as any)?.name}`,
      receiver: [booking.sender._id.toString()],
      isRead: false,
      filePath: FilePathType.BOOKING,
      referenceId: booking.id
    } as CreateNotificationDto)

    this.snsService.publish<CreateAuditLogsDto>("audit.create", {
      action: `Booking #${booking.id} in transit`,
      user: userId as any,
      old_value: booking.current_stage,
      new_value: TIMELINE_TYPE.IN_TRANSIT,
      reason: "Booking in transit"
    });

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Booking in transit successfully',
      success: true,
      data: booking,
    });
  }


  async markAsDeliverdParcel(bookingId: string, userId: string, payload: DeliveryConfirmationDto) {
    const booking = await this.bookingModel.findById(bookingId).populate(['transporter', 'sender']).lean()


    if (!booking) {
      throw new ApiError(404, 'Booking not found')
    }

    if (booking.transporter._id.toString() !== userId) {
      throw new ApiError(403, 'You are not authorized to update this booking')
    }

    if (booking.status === BOOKING_STATUS.DELIVERED) {
      throw new ApiError(400, 'Your booking is already Deliverd')
    }

    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      throw new ApiError(400, 'Your booking is not confirmed yet')
    }

    if (booking.current_stage !== TIMELINE_TYPE.IN_TRANSIT) {
      throw new ApiError(400, 'Your booking is not in transit state')
    }

    if (payload.proof_image) {
      const uploadedImage = await this.s3Service.uploadFile(payload.proof_image)
      payload.proof_image = uploadedImage?.url
    }

    if (payload.damage_image) {
      const uploadedImage = await this.s3Service.uploadFile(payload.damage_image)
      payload.damage_image = uploadedImage?.url
    }

    await this.bookingModel.findByIdAndUpdate(booking._id, { status: BOOKING_STATUS.DELIVERED, dropoff_condition: payload, current_stage: TIMELINE_TYPE.DELIVERED, $addToSet: { timeline: { date: new Date(), status: TIMELINE_TYPE.DELIVERED } } })
    await this.cacheService.deleteByPattern(`booking_request:${userId}`)
    await this.cacheService.deleteByPattern(`my_parcel:${booking.sender._id.toString()}`)
    await this.snsService.publish('wallet.add.payment', {
      user: booking.transporter._id.toString(),
      amount: booking.price_breakdown.subtotal,
      booking_id: booking.id,
      _id: booking._id,
      sender: booking.sender._id.toString()
    })
    await this.snsService.publish('notification.send', {
      title: `Booking #${booking.id}`,
      message: `Booking #${booking.id} has been delivered by ${(booking.transporter as any)?.name}`,
      receiver: [booking.sender._id.toString()],
      isRead: false,
      filePath: FilePathType.BOOKING,
      referenceId: booking.id
    } as CreateNotificationDto)

    this.snsService.publish<CreateAuditLogsDto>("audit.create", {
      action: `Booking #${booking.id} delivered`,
      user: userId as any,
      old_value: booking.current_stage,
      new_value: TIMELINE_TYPE.DELIVERED,
      reason: "Booking delivered"
    });

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Booking delivered successfully',
      success: true,
      data: booking,
    });
  }


  async cancelBooking(bookingId: string, userId: string, body: CancelBookingDto) {
    const booking = await this.bookingModel.findById(bookingId).populate(['transporter', 'sender']).lean()


    if (!booking) {
      throw new ApiError(404, 'Booking not found')
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw new ApiError(400, 'Your booking is already cancelled')
    }

    if (booking.status === BOOKING_STATUS.DELIVERED) {
      throw new ApiError(400, 'Your booking is already delivered')
    }

    if (booking.status === BOOKING_STATUS.PENDING) {
      throw new ApiError(400, 'Your booking is not confirmed yet')
    }

    await this.bookingModel.findByIdAndUpdate(booking._id, { status: BOOKING_STATUS.CANCELLED, cancellation_reason: body.cancellation_reason, current_stage: TIMELINE_TYPE.CANCELLED, $addToSet: { timeline: { date: new Date(), status: TIMELINE_TYPE.CANCELLED } } })
    await this.cacheService.deleteByPattern(`booking_request:${userId}`)
    await this.cacheService.deleteByPattern(`my_parcel:${booking.sender._id.toString()}`)
    await this.snsService.publish('notification.send', {
      title: `Booking #${booking.id}`,
      message: `Booking #${booking.id} has been cancelled by ${(booking.transporter as any)?.name}`,
      receiver: [booking.sender._id.toString()],
      isRead: false,
      filePath: FilePathType.BOOKING,
      referenceId: booking.id
    } as CreateNotificationDto)

    this.snsService.publish<CreateAuditLogsDto>("audit.create", {
      action: `Booking #${booking.id} cancelled`,
      user: userId as any,
      old_value: booking.current_stage,
      new_value: TIMELINE_TYPE.CANCELLED,
      reason: body.cancellation_reason
    });

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Booking cancelled successfully',
      success: true,
      data: booking,
    });
  }



  async getMyParcel(userId: string, query: Record<string, any>) {
    const cache = await this.cacheService.get(`my_parcel:${userId}`, query);
    if (cache) {
      return cache;
    }

    const qb = new MongooseQueryBuilder(this.bookingModel.find({ sender: userId }), query)
      .paginate().sort('-created_at').search(['id']).filter()

    const [bookings, pagination] = await Promise.all([
      qb.modelQuery.populate('transporter', 'name email image').lean(),
      qb.getPaginationInfo()
    ]);

    await this.cacheService.set(`my_parcel:${userId}`, { bookings, pagination }, 60 * 60, query)
    return { bookings, pagination }
  }

  async getSingleBookingDetails(bookingId: string, userId: string) {
    const booking = await this.bookingModel.findById(bookingId).populate([
      { path: 'transporter', select: 'name email image' },
      { path: 'sender', select: 'name email image' },
      { path: 'receiver', select: 'name email image' },
    ]).lean()
    if (!booking) {
      throw new ApiError(404, 'Booking not found')
    }

    return booking
  }





}

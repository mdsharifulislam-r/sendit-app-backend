import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateNotificationDto, FilePathType } from 'apps/communication/src/communication.dto';
import { Wallet, WalletDocument } from 'apps/payment/src/wallet/wallet.entity';
import { User, UserDocument } from 'apps/root/src/user/user.entity';
import { Model, Types } from 'mongoose';
import { ADMIN_SUB_ROLE, USER_ROLES } from 'utils/enums/user';
import { ApiError } from 'utils/errors/api-error';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import sendResponse from 'utils/helper/sendResponse';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { CreateAuditLogsDto } from './audit-logs/audit-logs.dto';
import { Trip, TripDocument } from 'apps/trip/src/trip.entity';
import { TRIP_STATUS } from 'apps/trip/src/trip.dto';
import { Transaction, TRANSACTION_STATUS, TRANSACTION_TYPE, TransactionDocument } from 'apps/payment/src/transaction/transaction.entity';
import { CreateAdminDto, UpdateAdminDto } from './admin.dto';
import { BOOKING_STATUS } from 'apps/booking/src/booking.dto';
import { Booking, BookingDocument } from 'apps/booking/src/booking.entity';
import { Report, ReportDocument } from 'apps/communication/src/report/report.entity';
import { Ticket, TicketDocument, TicketStatus } from './ticket/ticket.entity';
import { RiskyItems, RiskyItemsDocument } from './risk-settings/risk-settings.entity';
import { CreateUserDto } from 'apps/root/src/user/user.dto';
import { Review, ReviewDocument } from 'apps/trip/src/review/review.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Wallet.name)
    private walletModel: Model<WalletDocument>,
    @InjectModel(Trip.name)
    private tripModel: Model<TripDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Booking.name)
    private bookingModel: Model<BookingDocument>,
    @InjectModel(Report.name)
    private reportModel: Model<ReportDocument>,
    @InjectModel(Ticket.name)
    private ticketModel: Model<TicketDocument>,
    @InjectModel(RiskyItems.name)
    private riskyItemModel: Model<RiskyItemsDocument>,
    @InjectModel(Review.name)
    private reviewModel: Model<ReviewDocument>,
    private snsService: SnsService,
  ) { }

  async createAdmin(createAdminDto: CreateAdminDto, userId: string) {
    const userExists = await this.userModel.findOne({ email: createAdminDto.email })
    if (userExists) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'User already exists')
    }

    if (createAdminDto.admin_sub_role == ADMIN_SUB_ROLE.SUPER_ADMIN) {
      (createAdminDto as any).role = USER_ROLES.SUPER_ADMIN;
      delete (createAdminDto as any).admin_sub_role;
    }

    else {
      (createAdminDto as any).role = USER_ROLES.ADMIN;
      (createAdminDto as any).admin_sub_role = createAdminDto.admin_sub_role;
    }


    const user = await this.userModel.create({ ...createAdminDto, verified: true, status: 'active' })
    this.snsService.publish<CreateAuditLogsDto>('audit.create', {
      action: 'Admin Created',
      old_value: 'N/A',
      new_value: user.id,
      user: userId as any,
      reason: `Add ${user?.name} as ${user?.role} and ${user?.admin_sub_role ? `as ${user?.admin_sub_role}` : ''}`
    })
    this.snsService.publish<CreateNotificationDto>('notification.send', {
      title: `You are added as ${user?.role} and ${user?.admin_sub_role ? `as ${user?.admin_sub_role}` : ''}`,
      message: `An admin has added you as ${user?.role} and ${user?.admin_sub_role ? `as ${user?.admin_sub_role}` : ''}`,
      receiver: [user._id.toString()],
      isRead: false,
      filePath: FilePathType.USER,
      referenceId: user.id,
    })
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Admin created successfully',
      data: user,
      success: true,
    })
  }


  async getAllAdmins(query: Record<string, any>) {
    const adminQuery = new QueryBuilder(this.userModel.find({ role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } }, { id: 1, _id: 1, name: 1, email: 1, contact: 1, role: 1, admin_sub_role: 1, permissions: 1 }), query)
      .filter()
      .sort()
      .paginate()
      .search(['name', 'email', 'contact', 'role', 'admin_sub_role'])

    let [admins, pagination] = await Promise.all([
      adminQuery.modelQuery.lean(),
      adminQuery.getPaginationInfo()
    ])

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Admins list',
      data: admins,
      success: true,
      pagination
    })
  }

  async updateAdmin(id: string, updateAdminDto: UpdateAdminDto, userId: string) {
    const user = await this.userModel.findById(id).lean().exec()
    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found')
    }

    if (updateAdminDto.admin_sub_role == ADMIN_SUB_ROLE.SUPER_ADMIN) {
      (updateAdminDto as any).role = USER_ROLES.SUPER_ADMIN;
      delete (updateAdminDto as any).admin_sub_role;
    }

    else if (updateAdminDto.admin_sub_role) {
      (updateAdminDto as any).role = USER_ROLES.ADMIN;
      (updateAdminDto as any).admin_sub_role = updateAdminDto.admin_sub_role;
    }
    const updatedUser = await this.userModel.findByIdAndUpdate(id, updateAdminDto, { new: true }).lean().exec()
    this.snsService.publish<CreateAuditLogsDto>('audit.create', {
      action: 'Admin Updated',
      old_value: '',
      new_value: '',
      user: userId as any,
      reason: `Update ${user?.name} account`
    })
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Admin updated successfully',
      data: updatedUser,
      success: true,
    })
  }



  async getUserList(query: Record<string, any>) {
    const userQuery = new QueryBuilder(this.userModel.find({ role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } }, { id: 1, _id: 1, name: 1, email: 1, contact: 1, role: 1, isKycVerified: 1, image: 1 }), query)
      .filter()
      .sort()
      .paginate()
      .search(['name', 'email', 'contact', 'role'])

    let [users, pagination] = await Promise.all([
      userQuery.modelQuery.lean(),
      userQuery.getPaginationInfo()
    ])

    users = await Promise.all(
      users.map(async (user) => {
        const wallet = await this.walletModel.findOne({ user: user._id }).lean();
        return {
          ...user,
          wallet_balance: Number(wallet?.balance || 0 / 100),
        };
      }),
    );

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'User list',
      data: users,
      success: true,
      pagination
    });

  }

  async getUserUsingId(id: string) {
    const user: any = await this.userModel.findById(id).lean().exec()
    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found')
    }
    const wallet = await this.walletModel.findOne({ user: user._id }).lean();
    const data = {
      ...user,
      wallet_balance: Number(wallet?.balance || 0 / 100),
    }
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'User details',
      data: data,
      success: true,
    })
  }


  async approveKycVerification(id: string, userId: string) {
    const user = await this.userModel.findById(id, { isKycVerified: 1, name: 1 }).lean().exec()
    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found')
    }

    if (user.isKycVerified) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'User already verified')
    }
    await this.userModel.findByIdAndUpdate(id, { isKycVerified: true }).lean().exec()
    this.snsService.publish<CreateNotificationDto>('notification.send', {
      title: 'KYC Verification',
      message: 'Your KYC verification has been approved',
      receiver: [id],
      isRead: false,
      filePath: FilePathType.USER,
      referenceId: id

    })

    this.snsService.publish<CreateAuditLogsDto>('audit.create', {
      action: 'Kyc Approved',
      old_value: 'Pending',
      new_value: 'Approved',
      user: userId as any,
      reason: `${user.name} application for KYC verification has been approved`
    })

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'User verified successfully',
      data: null,
      success: true,
    })
  }


  async suspendUser(id: string, userId: string) {
    const user = await this.userModel.findById(id, { status: 1, name: 1 }).lean().exec()
    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found')
    }
    if (user.status == 'delete') {
      await this.userModel.findByIdAndUpdate(id, { status: 'active' }).lean().exec()
      this.snsService.publish<CreateNotificationDto>('notification.send', {
        title: 'Account Activated',
        message: 'Your account has been activated',
        receiver: [id],
        isRead: false,
        filePath: FilePathType.USER,
        referenceId: id

      })
      this.snsService.publish<CreateAuditLogsDto>('audit.create', {
        action: 'User Activated',
        old_value: 'Suspended',
        new_value: 'Active',
        user: userId as any,
        reason: `${user.name} account has been activated`
      })
      return sendResponse({
        statusCode: HttpStatus.OK,
        message: 'User activated successfully',
        data: null,
        success: true,
      })
    }
    await this.userModel.findByIdAndUpdate(id, { status: 'delete' }).lean().exec()
    this.snsService.publish<CreateNotificationDto>('notification.send', {
      title: 'Account Suspended',
      message: 'Your account has been suspended',
      receiver: [id],
      isRead: false,
      filePath: FilePathType.USER,
      referenceId: id

    })
    this.snsService.publish<CreateAuditLogsDto>('audit.create', {
      action: 'User Suspended',
      old_value: 'Active',
      new_value: 'Suspended',
      user: userId as any,
      reason: `${user.name} account has been suspended`
    })
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'User suspended successfully',
      data: null,
      success: true,
    })
  }



  async getAllTrips(query: Record<string, any>) {
    const tripQuery = new QueryBuilder(this.tripModel.find({ status: TRIP_STATUS.PUBLISHED }), query)
      .filter()
      .sort()
      .paginate()
      .search(['id', 'departure_address', 'return_address'])

    let [trips, pagination] = await Promise.all([
      tripQuery.modelQuery.populate([{ path: 'user', select: 'name email image' }]).lean(),
      tripQuery.getPaginationInfo()
    ])

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Trip list fetch successfully',
      data: trips,
      success: true,
      pagination
    })

  }


  async getTripDetails(id: string) {
    const trip = await this.tripModel.findById(id).populate([{ path: 'user', select: 'name email image' }]).lean().exec()
    if (!trip) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Trip not found')
    }
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Trip details fetch successfully',
      data: trip,
      success: true,
    })
  }

  async cancelTrip(id: string, userId: string, reason?: string) {
    const trip = await this.tripModel.findById(id).lean().exec()
    if (!trip) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Trip not found')
    }
    if (trip.status == TRIP_STATUS.CANCELLED) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'Trip already cancelled')
    }
    await this.tripModel.findByIdAndUpdate(id, { status: TRIP_STATUS.CANCELLED, cancellation_reason: reason }).lean().exec()
    this.snsService.publish<CreateNotificationDto>('notification.send', {
      title: 'Trip Cancelled',
      message: `Your trip has been cancelled by admin ${reason ? `for reason: ${reason}` : ''}`,
      receiver: [trip.user as any],
      isRead: false,
      filePath: FilePathType.TRIP,
      referenceId: id

    })
    this.snsService.publish<CreateAuditLogsDto>('audit.create', {
      action: 'Trip Cancelled',
      old_value: trip.status,
      new_value: TRIP_STATUS.CANCELLED,
      user: userId as any,
      reason: reason || `Trip ${trip.id} has been cancelled by admin`
    })
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Trip cancelled successfully',
      data: null,
      success: true,
    })
  }

  async getAllTransactions(query: Record<string, any>) {
    let userIds = [] as any
    if (query.searchTerm) {
      const users = await this.userModel.find({ name: { $regex: query.searchTerm, $options: 'i' } }, { _id: 1 }).distinct('_id').lean().exec()
      console.log(users);

      if (users.length) {
        userIds = users
      }
    }

    let initQuery: Record<string, any> = {}
    if (userIds.length) {
      initQuery.owner = { $in: userIds }
    }

    if (query.withdraw == 'true') {
      initQuery.type = TRANSACTION_TYPE.WITHDRAW
    }
    const transactionQuery = new QueryBuilder(this.transactionModel.find(initQuery), query)
      .filter(['withdraw'])
      .sort()
      .paginate()
      .search(userIds.length ? [] : ['trx_id', 'title'])

    let [transactions, pagination] = await Promise.all([
      transactionQuery.modelQuery.populate([{ path: 'owner', select: 'name email image' }]).lean(),
      transactionQuery.getPaginationInfo()
    ])

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Transaction list fetch successfully',
      data: transactions,
      success: true,
      pagination
    })
  }

  async getSingleTransaction(id: string) {
    const transaction = await this.transactionModel.findById(id).populate([{ path: 'owner', select: 'name email image' }]).lean().exec()
    if (!transaction) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Transaction not found')
    }
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Transaction details fetch successfully',
      data: transaction,
      success: true,
    })
  }


  async getTransactionStatics() {
    const [total_earnings, pending_earnings, total_withdraw_earnings] = await Promise.all([
      this.transactionModel.aggregate([
        { $match: { status: TRANSACTION_STATUS.COMPLETED } },
        { $group: { _id: null, total_amount: { $sum: '$amount' } } }
      ]),
      this.transactionModel.aggregate([
        { $match: { status: TRANSACTION_STATUS.PENDING } },
        { $group: { _id: null, total_amount: { $sum: '$amount' } } }
      ]),
      this.transactionModel.aggregate([
        { $match: { type: TRANSACTION_TYPE.WITHDRAW, status: TRANSACTION_STATUS.COMPLETED } },
        { $group: { _id: null, total_amount: { $sum: '$amount' } } }
      ])
    ])

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Transaction statics fetch successfully',
      data: {
        total_earnings: total_earnings[0]?.total_amount || 0,
        pending_earnings: pending_earnings[0]?.total_amount || 0,
        total_withdraw_earnings: total_withdraw_earnings[0]?.total_amount || 0,
      },
      success: true,
    })

  }

  async getAllOverViewOfPlatform() {
    const [total_users, total_trips, total_bookings, total_transactions, total_reports, total_tickets, total_risky_items] = await Promise.all([
      this.userModel.countDocuments({ status: { $ne: 'delete' } }),
      this.tripModel.countDocuments({ status: TRIP_STATUS.PUBLISHED }),
      this.bookingModel.countDocuments({ status: { $ne: BOOKING_STATUS.CANCELLED } }),
      this.transactionModel.countDocuments({ status: TRANSACTION_STATUS.COMPLETED }),
      this.reportModel.countDocuments({ status: 'open' }),
      this.ticketModel.countDocuments({ status: 'open' }),
      this.riskyItemModel.countDocuments()
    ])
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Platform overview fetch successfully',
      data: {
        total_users,
        total_trips,
        total_bookings,
        total_transactions,
        total_reports,
        total_tickets,
        total_risky_items
      },
      success: true,
    })

  }


  async addUserIntoDb(data: CreateUserDto) {
    const exist = await this.userModel.findOne({ email: data.email })
    if (exist) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'User already exists')
    }
    const user = await this.userModel.create({
      ...data,
      verified: true
    })

    this.snsService.publish<CreateAuditLogsDto>('audit.create', {
      action: 'User Added',
      old_value: 'null',
      new_value: 'Active',
      user: user._id,
      reason: `${user.name} has been added by admin`
    })

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'User added successfully',
      data: user,
      success: true,
    })
  }



  async getSystemAnalyticsAndReports() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const calcRate = (numerator: number, denominator: number) =>
      denominator === 0 ? 0 : Number(((numerator / denominator) * 100).toFixed(1));

    const calcChange = (current: number, previous: number) =>
      previous === 0 ? (current > 0 ? 100 : 0) : Number((((current - previous) / previous) * 100).toFixed(1));

    const calcAbsoluteChange = (current: number, previous: number) =>
      Number((current - previous).toFixed(1));

    const nonAdminFilter = { role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } };

    const [
      bookingStats,
      tripStats,
      ticketStats,
      reportStats,
      kycStats,
      payoutStats,
      reviewStats,
      topRoutes,
      disputeTrends,
      financialStats,
      supportStats,
    ] = await Promise.all([
      // Booking counts for conversion & booking rate
      this.bookingModel.aggregate([
        {
          $facet: {
            current: [
              { $match: { created_at: { $gte: thirtyDaysAgo } } },
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  delivered: { $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.DELIVERED] }, 1, 0] } },
                  confirmed: { $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.CONFIRMED] }, 1, 0] } },
                  with_trip: { $sum: { $cond: [{ $ne: ['$trip', null] }, 1, 0] } },
                },
              },
            ],
            previous: [
              { $match: { created_at: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  delivered: { $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.DELIVERED] }, 1, 0] } },
                  confirmed: { $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.CONFIRMED] }, 1, 0] } },
                  with_trip: { $sum: { $cond: [{ $ne: ['$trip', null] }, 1, 0] } },
                },
              },
            ],
            all_time: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  delivered: { $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.DELIVERED] }, 1, 0] } },
                  confirmed: { $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.CONFIRMED] }, 1, 0] } },
                  with_trip: { $sum: { $cond: [{ $ne: ['$trip', null] }, 1, 0] } },
                },
              },
            ],
          },
        },
      ]),

      // Trip counts for booking rate
      this.tripModel.aggregate([
        {
          $facet: {
            current: [
              { $match: { createdAt: { $gte: thirtyDaysAgo }, status: TRIP_STATUS.PUBLISHED } },
              { $count: 'total' },
            ],
            previous: [
              { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, status: TRIP_STATUS.PUBLISHED } },
              { $count: 'total' },
            ],
            all_time: [
              { $match: { status: TRIP_STATUS.PUBLISHED } },
              { $count: 'total' },
            ],
          },
        },
      ]),

      // Ticket counts for dispute rate
      this.ticketModel.aggregate([
        {
          $facet: {
            current: [{ $match: { createdAt: { $gte: thirtyDaysAgo } } }, { $count: 'total' }],
            previous: [{ $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } }, { $count: 'total' }],
            all_time: [{ $count: 'total' }],
          },
        },
      ]),

      // Report counts (disputes)
      this.reportModel.aggregate([
        {
          $facet: {
            current: [{ $match: { createdAt: { $gte: thirtyDaysAgo } } }, { $count: 'total' }],
            previous: [{ $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } }, { $count: 'total' }],
            all_time: [{ $count: 'total' }],
          },
        },
      ]),

      // KYC approval rate
      this.userModel.aggregate([
        { $match: nonAdminFilter },
        {
          $facet: {
            current: [
              { $match: { createdAt: { $gte: thirtyDaysAgo } } },
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  approved: { $sum: { $cond: ['$isKycVerified', 1, 0] } },
                  submitted: {
                    $sum: {
                      $cond: [
                        {
                          $or: [
                            { $and: [{ $ne: ['$passport_info.file', ''] }, { $ne: ['$passport_info.file', null] }] },
                            { $and: [{ $ne: ['$id_card_info.front', ''] }, { $ne: ['$id_card_info.front', null] }] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            previous: [
              { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  approved: { $sum: { $cond: ['$isKycVerified', 1, 0] } },
                  submitted: {
                    $sum: {
                      $cond: [
                        {
                          $or: [
                            { $and: [{ $ne: ['$passport_info.file', ''] }, { $ne: ['$passport_info.file', null] }] },
                            { $and: [{ $ne: ['$id_card_info.front', ''] }, { $ne: ['$id_card_info.front', null] }] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            all_time: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  approved: { $sum: { $cond: ['$isKycVerified', 1, 0] } },
                  submitted: {
                    $sum: {
                      $cond: [
                        {
                          $or: [
                            { $and: [{ $ne: ['$passport_info.file', ''] }, { $ne: ['$passport_info.file', null] }] },
                            { $and: [{ $ne: ['$id_card_info.front', ''] }, { $ne: ['$id_card_info.front', null] }] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      ]),

      // Average payout time (withdraw transactions)
      this.transactionModel.aggregate([
        {
          $match: {
            type: TRANSACTION_TYPE.WITHDRAW,
            status: TRANSACTION_STATUS.COMPLETED,
          },
        },
        {
          $facet: {
            current: [
              { $match: { createdAt: { $gte: thirtyDaysAgo } } },
              {
                $group: {
                  _id: null,
                  avg_days: {
                    $avg: {
                      $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
                    },
                  },
                },
              },
            ],
            previous: [
              { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
              {
                $group: {
                  _id: null,
                  avg_days: {
                    $avg: {
                      $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
                    },
                  },
                },
              },
            ],
            all_time: [
              {
                $group: {
                  _id: null,
                  avg_days: {
                    $avg: {
                      $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
                    },
                  },
                },
              },
            ],
          },
        },
      ]),

      // Customer satisfaction (reviews)
      this.reviewModel.aggregate([
        { $match: { status: 'approved' } },
        {
          $facet: {
            current: [
              { $match: { createdAt: { $gte: thirtyDaysAgo } } },
              { $group: { _id: null, avg_rating: { $avg: '$rating' } } },
            ],
            previous: [
              { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
              { $group: { _id: null, avg_rating: { $avg: '$rating' } } },
            ],
            all_time: [{ $group: { _id: null, avg_rating: { $avg: '$rating' } } }],
          },
        },
      ]),

      // Top routes by demand
      this.bookingModel.aggregate([
        {
          $match: {
            status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.DELIVERED] },
          },
        },
        {
          $group: {
            _id: { pickup: '$pickup_address', dropoff: '$dropoff_address' },
            bookings: { $sum: 1 },
            revenue: { $sum: '$price_breakdown.service_charge' },
          },
        },
        { $sort: { bookings: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            route: {
              $concat: [
                { $ifNull: ['$_id.pickup', 'Unknown'] },
                ' → ',
                { $ifNull: ['$_id.dropoff', 'Unknown'] },
              ],
            },
            bookings: 1,
            revenue: { $round: ['$revenue', 2] },
          },
        },
      ]),

      // Dispute trends by report type
      this.reportModel.aggregate([
        {
          $group: {
            _id: '$report_type',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            reason: { $ifNull: ['$_id', 'Other'] },
            count: 1,
          },
        },
      ]),

      // Financial overview
      this.transactionModel.aggregate([
        {
          $facet: {
            revenue: [
              {
                $match: {
                  type: TRANSACTION_TYPE.PAYMENT,
                  status: TRANSACTION_STATUS.COMPLETED,
                },
              },
              { $group: { _id: null, total: { $sum: '$platform_charge' } } },
            ],
            commission: [
              {
                $match: {
                  status: TRANSACTION_STATUS.COMPLETED,
                  platform_charge: { $gt: 0 },
                },
              },
              { $group: { _id: null, total: { $sum: '$platform_charge' } } },
            ],
            payouts: [
              {
                $match: {
                  type: TRANSACTION_TYPE.WITHDRAW,
                  status: TRANSACTION_STATUS.COMPLETED,
                },
              },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ],
            booking_revenue: [
              {
                $lookup: {
                  from: 'bookings',
                  localField: 'booking',
                  foreignField: '_id',
                  as: 'booking_data',
                },
              },
              { $unwind: { path: '$booking_data', preserveNullAndEmptyArrays: false } },
              {
                $match: {
                  type: TRANSACTION_TYPE.PAYMENT,
                  status: TRANSACTION_STATUS.COMPLETED,
                },
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: '$booking_data.price_breakdown.service_charge' },
                  commission: { $sum: '$booking_data.price_breakdown.service_charge' },
                },
              },
            ],
          },
        },
      ]),

      // Support performance
      this.ticketModel.aggregate([
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  resolved: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.CLOSED] }, 1, 0] } },
                  open: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.OPEN] }, 1, 0] } },
                },
              },
            ],
            response_time: [
              { $match: { status: TicketStatus.CLOSED } },
              {
                $group: {
                  _id: null,
                  avg_hours: {
                    $avg: {
                      $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60],
                    },
                  },
                },
              },
            ],
          },
        },
      ]),
    ]);

    const currentBookings = bookingStats[0]?.current[0] || { total: 0, delivered: 0, confirmed: 0, with_trip: 0 };
    const previousBookings = bookingStats[0]?.previous[0] || { total: 0, delivered: 0, confirmed: 0, with_trip: 0 };
    const allTimeBookings = bookingStats[0]?.all_time[0] || { total: 0, delivered: 0, confirmed: 0, with_trip: 0 };

    const currentTrips = tripStats[0]?.current[0]?.total || 0;
    const previousTrips = tripStats[0]?.previous[0]?.total || 0;
    const allTimeTrips = tripStats[0]?.all_time[0]?.total || 0;

    const currentTickets = ticketStats[0]?.current[0]?.total || 0;
    const previousTickets = ticketStats[0]?.previous[0]?.total || 0;
    const allTimeTickets = ticketStats[0]?.all_time[0]?.total || 0;

    const currentKyc = kycStats[0]?.current[0] || { approved: 0, submitted: 0 };
    const previousKyc = kycStats[0]?.previous[0] || { approved: 0, submitted: 0 };
    const allTimeKyc = kycStats[0]?.all_time[0] || { approved: 0, submitted: 0 };

    const currentPayoutDays = payoutStats[0]?.current[0]?.avg_days || 0;
    const previousPayoutDays = payoutStats[0]?.previous[0]?.avg_days || 0;
    const allTimePayoutDays = payoutStats[0]?.all_time[0]?.avg_days || 0;

    const currentRating = reviewStats[0]?.current[0]?.avg_rating || 0;
    const previousRating = reviewStats[0]?.previous[0]?.avg_rating || 0;
    const allTimeRating = reviewStats[0]?.all_time[0]?.avg_rating || 0;

    const conversionRate = calcRate(allTimeBookings.delivered + allTimeBookings.confirmed, allTimeBookings.total);
    const prevConversionRate = calcRate(previousBookings.delivered + previousBookings.confirmed, previousBookings.total);
    const currConversionRate = calcRate(currentBookings.delivered + currentBookings.confirmed, currentBookings.total);

    const bookingRate = calcRate(allTimeBookings.with_trip, allTimeTrips);
    const prevBookingRate = calcRate(previousBookings.with_trip, previousTrips);
    const currBookingRate = calcRate(currentBookings.with_trip, currentTrips);

    const disputeRate = calcRate(allTimeTickets, allTimeBookings.total);
    const prevDisputeRate = calcRate(previousTickets, previousBookings.total);
    const currDisputeRate = calcRate(currentTickets, currentBookings.total);

    const kycApprovalRate = calcRate(allTimeKyc.approved, allTimeKyc.submitted || allTimeKyc.approved);
    const prevKycRate = calcRate(previousKyc.approved, previousKyc.submitted || previousKyc.approved);
    const currKycRate = calcRate(currentKyc.approved, currentKyc.submitted || currentKyc.approved);

    const supportTotals = supportStats[0]?.totals[0] || { total: 0, resolved: 0, open: 0 };
    const avgResponseHours = Number((supportStats[0]?.response_time[0]?.avg_hours || 0).toFixed(1));
    const firstContactResolution = calcRate(supportTotals.resolved, supportTotals.total);

    const financial = financialStats[0];
    const totalRevenue =
      financial?.booking_revenue[0]?.total ||
      financial?.revenue[0]?.total ||
      0;
    const commissionEarned =
      financial?.booking_revenue[0]?.commission ||
      financial?.commission[0]?.total ||
      0;
    const totalPayouts = financial?.payouts[0]?.total || 0;

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'System analytics and reports fetched successfully',
      success: true,
      data: {
        kpis: {
          conversion_rate: {
            value: conversionRate,
            unit: '%',
            change: calcChange(currConversionRate, prevConversionRate),
          },
          booking_rate: {
            value: bookingRate,
            unit: '%',
            change: calcChange(currBookingRate, prevBookingRate),
          },
          dispute_rate: {
            value: disputeRate,
            unit: '%',
            change: calcChange(currDisputeRate, prevDisputeRate),
          },
          kyc_approval_rate: {
            value: kycApprovalRate,
            unit: '%',
            change: calcChange(currKycRate, prevKycRate),
          },
          avg_payout_time: {
            value: Number(allTimePayoutDays.toFixed(1)),
            unit: 'days',
            change: calcAbsoluteChange(
              Number(currentPayoutDays.toFixed(1)),
              Number(previousPayoutDays.toFixed(1)),
            ),
          },
          customer_satisfaction: {
            value: Number(allTimeRating.toFixed(1)),
            max: 5,
            change: calcAbsoluteChange(
              Number(currentRating.toFixed(1)),
              Number(previousRating.toFixed(1)),
            ),
          },
        },
        top_routes_by_demand: topRoutes,
        support_performance: {
          avg_response_time: {
            value: avgResponseHours,
            unit: 'hrs',
          },
          first_contact_resolution: {
            value: firstContactResolution,
            unit: '%',
          },
          tickets_resolved: {
            resolved: supportTotals.resolved,
            total: supportTotals.total,
            open: supportTotals.open,
          },
        },
        dispute_trends: disputeTrends,
        financial_overview: {
          total_revenue: Number(totalRevenue.toFixed(2)),
          commission_earned: Number(commissionEarned.toFixed(2)),
          total_payouts: Number(totalPayouts.toFixed(2)),
        },
        summary: {
          total_bookings: allTimeBookings.total,
          total_trips: allTimeTrips,
          total_tickets: allTimeTickets,
          total_reports: reportStats[0]?.all_time[0]?.total || 0,
          total_disputes: allTimeTickets,
        },
      },
    });
  }







}

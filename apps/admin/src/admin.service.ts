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
import { Ticket, TicketDocument } from './ticket/ticket.entity';
import { RiskyItems, RiskyItemsDocument } from './risk-settings/risk-settings.entity';

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



}

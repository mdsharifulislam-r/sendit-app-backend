import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ticket, TicketDocument } from './ticket.entity';
import { CreateTicketDto, ResolveTicketDto } from './ticket.dto';
import { Booking, BookingDocument } from 'apps/booking/src/booking.entity';
import { ApiError } from 'utils/errors/api-error';
import { Report } from 'apps/communication/src/report/report.entity';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateNotificationDto, FilePathType } from 'apps/communication/src/communication.dto';
import { CreateAuditLogsDto } from '../audit-logs/audit-logs.dto';
import sendResponse from 'utils/helper/sendResponse';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { CreateTransactionDto } from 'apps/payment/src/transaction/transaction.dto';
import { TRANSACTION_PAYMENT_TYPE, TRANSACTION_STATUS, TRANSACTION_TYPE } from 'apps/payment/src/transaction/transaction.entity';
import { BOOKING_STATUS } from 'apps/booking/src/booking.dto';

@Injectable()
export class TicketService {

    constructor(@InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
        @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
        @InjectModel(Report.name) private reportModel: Model<Report>,
        private readonly snsService: SnsService,
        private readonly cacheService: CacheService
    ) { }

    async createTicket(createTicketDto: CreateTicketDto, user: string) {
        const booking = await this.bookingModel.findOne({ id: createTicketDto.booking }).lean()
        if (!booking) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Booking not found')
        }

        const report = await this.reportModel.findById(createTicketDto.report).lean()
        if (!report) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Report not found')
        }

        const report_to = booking.sender.toString() === report.user.toString() ? booking.transporter : booking.sender

        const ticket = await this.ticketModel.create({
            ...createTicketDto,
            booking: booking._id,
            report: report._id,
            report_owner: report.user,
            report_to: report_to,
            trip: booking.trip,
            price_breakdown: booking.price_breakdown,
        })

        await Promise.all([
            this.snsService.publish<CreateNotificationDto>('notification.send', {
                title: `Ticket open!!`,
                message: `Admin open ticket ${ticket.ticket_id}`,
                isRead: false,
                receiver: [ticket.report_owner.toString()],
                filePath: FilePathType.REPORT,
                referenceId: ticket.ticket_id
            }),
            this.snsService.publish<CreateNotificationDto>('notification.send', {
                title: `Ticket open!!`,
                message: `You opened a ticket ${ticket.ticket_id}`,
                isRead: false,
                filePath: FilePathType.REPORT,
                referenceId: ticket.ticket_id
            }),
            this.snsService.publish<CreateAuditLogsDto>('audit.create', {
                action: 'Ticket Open',
                user: user as any,
                new_value: `Open`,
                old_value: `Uninitialised`,
                reason: createTicketDto.title,
            }),

            this.cacheService.deleteByPattern('tickets')
        ])



        return sendResponse({
            statusCode: 201,
            success: true,
            message: 'Ticket created successfully',
            data: ticket
        })


    }

    async getAllTicket(query: Record<string, any>) {
        const cache = await this.cacheService.get('tickets', query)
        if (cache) {
            return cache
        }
        const ticketQuery = new QueryBuilder(this.ticketModel.find(), query).search(['title', 'description', 'ticket_id'])
            .filter()
            .sort()
            .paginate()

        const [tickets, pagination] = await Promise.all([
            ticketQuery.modelQuery.populate([
                {
                    path: 'booking',
                    select: 'id status timeline pickup_address dropoff_address'
                },
                {
                    path: 'report_owner',
                    select: 'id name email image'
                },
                {
                    path: 'report_to',
                    select: 'id name email image'
                },
                {
                    path: 'trip',
                    select: 'id departure_address return_address'
                }
            ]).lean(),
            ticketQuery.getPaginationInfo()
        ])
        await this.cacheService.set('tickets', { tickets, pagination }, 3600, query)
        return { tickets, pagination }
    }


    async resolveTicket(id: string, payload: ResolveTicketDto, userId: string) {
        const ticket = await this.ticketModel.findOne({ _id: id }).lean()
        if (!ticket) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Ticket not found')
        }
        if (ticket.status !== 'open') {
            throw new ApiError(HttpStatus.BAD_REQUEST, 'Ticket already closed')
        }

        const report = await this.reportModel.findById(ticket.report)
        if (!report) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Report not found')
        }


        if (payload?.amount) {
            await this.snsService.publish('add.balance', { userId: ticket.report_owner.toString(), amount: payload.amount })
            await Promise.all([
                this.snsService.publish<CreateTransactionDto>('transaction.created', {
                    amount: payload.amount,
                    type: TRANSACTION_TYPE.REFUND,
                    payment_status: TRANSACTION_PAYMENT_TYPE.DEBIT,
                    status: TRANSACTION_STATUS.COMPLETED,
                    ownerId: ticket.report_owner.toString(),
                    title: `Refund for ${ticket.ticket_id}`,
                    trx_id: ``
                }),

                this.snsService.publish<CreateAuditLogsDto>('audit.create', {
                    action: 'Ticket Resolved & Amount Refunded',
                    user: userId as any,
                    new_value: `Resolved & Amount Refunded`,
                    old_value: `Open`,
                    reason: `Ticket resolved & amount refunded`,
                }),

                this.snsService.publish<CreateNotificationDto>('notification.send', {
                    title: `Ticket Resolved & Amount Refunded`,
                    message: `Your ticket ${ticket.ticket_id} has been resolved & amount refunded`,
                    isRead: false,
                    receiver: [ticket.report_owner.toString()],
                    filePath: FilePathType.REPORT,
                    referenceId: ticket.ticket_id
                }),

                this.snsService.publish<CreateNotificationDto>('notification.send', {
                    title: `Ticket Resolved & Amount Refunded`,
                    message: `Your ticket ${ticket.ticket_id} has been resolved & amount refunded`,
                    isRead: false,
                    receiver: [ticket.report_to.toString()],
                    filePath: FilePathType.REPORT,
                    referenceId: ticket.ticket_id
                }),
                this.ticketModel.updateOne({ _id: ticket._id }, { status: 'closed', refund_amount: payload.amount }),
                this.cacheService.deleteByPattern('tickets'),
                this.bookingModel.findOneAndUpdate(
                    { _id: ticket.booking },
                    { status: BOOKING_STATUS.REFUNDED }
                ),
                this.reportModel.findOneAndUpdate(
                    { _id: ticket.report },
                    { status: 'closed' }
                ),

            ])

            return sendResponse({
                statusCode: 200,
                success: true,
                message: 'Ticket resolved successfully',
                data: ticket
            })
        }

        this.snsService.publish<CreateNotificationDto>('notification.send', {
            title: `Ticket Resolved`,
            message: `Your ticket ${ticket.ticket_id} has been resolved`,
            isRead: false,
            receiver: [ticket.report_owner.toString()],
            filePath: FilePathType.REPORT,
            referenceId: ticket.ticket_id
        })

        this.snsService.publish<CreateAuditLogsDto>('audit.create', {
            action: 'Ticket Resolved',
            user: userId as any,
            new_value: `Resolved`,
            old_value: `Open`,
            reason: `Ticket resolved`,
        })

        await this.ticketModel.updateOne({ _id: ticket._id }, { status: 'closed' })
        await this.reportModel.findOneAndUpdate(
            { _id: ticket.report },
            { status: 'closed' }
        ),
            await this.cacheService.deleteByPattern('tickets')
        return sendResponse({
            statusCode: 200,
            success: true,
            message: 'Ticket closed successfully',
            data: ticket
        })





    }




}

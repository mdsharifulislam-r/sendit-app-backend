import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from './report.entity';
import { CreateReportDto, RefundOnReportDto } from './report.dto';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { S3Service } from 'utils/helper-modules/upload/s3.service';
import sendResponse from 'utils/helper/sendResponse';
import { CreateNotificationDto, FilePathType } from '../communication.dto';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { CreateAuditLogsDto } from 'apps/admin/src/audit-logs/audit-logs.dto';
import { Booking, BookingDocument } from 'apps/booking/src/booking.entity';
import { ApiError } from 'utils/errors/api-error';
import { Chat, ChatDocument } from '../chat/chat.entity';
import { StripeService } from 'utils/helper-modules/stripe/stripe.service';


@Injectable()
export class ReportService {
    constructor(
        @InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>,
        @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
        @InjectModel(Chat.name) private readonly chatModel: Model<ChatDocument>,
        private readonly snsService: SnsService,
        private readonly s3Service: S3Service,
        private readonly cacheService: CacheService,
        private readonly stripeService: StripeService
    ) { }

    async createReport(user: string, report: CreateReportDto) {
        if (report.attachments) {
            report.attachments = await this.s3Service.uploadMultipleFiles(report.attachments)
        }
        const createdReport = await this.reportModel.create({
            ...report,
            user
        })
        await Promise.all([
            this.snsService.publish('chat.report.create', createdReport),
            this.snsService.publish<CreateNotificationDto>('notification.send', {
                title: 'Your report has been submitted successfully',
                message: `Your report has been submitted successfully`,
                isRead: false,
                receiver: [user],
                filePath: FilePathType.REPORT,
                referenceId: createdReport._id.toString(),
            }),
            this.snsService.publish<CreateNotificationDto>('notification.send', {
                title: 'New report has been submitted',
                message: `${createdReport.report_id} has been submitted. please check it.`,
                isRead: false,
                filePath: FilePathType.REPORT,
                referenceId: createdReport._id.toString(),
            }),
            this.snsService.publish<CreateAuditLogsDto>('audit.create', {
                action: 'Report Submitted',
                user: user as any,
                old_value: ``,
                new_value: ``,
                reason: report.description
            })
        ]);
        await this.cacheService.deleteByPattern('report')
        return sendResponse({
            message: 'report created successfully',
            success: true,
            statusCode: 200,
            data: createdReport
        })

    }

    async getReports(query: Record<string, any>) {
        const cache = await this.cacheService.get('report', query)
        if (cache) {
            return cache
        }
        const reportQuery = new QueryBuilder(this.reportModel.find(), query).paginate().sort().filter().search(['report_id'])

        const [reports, pagination] = await Promise.all([
            reportQuery.modelQuery.populate({ path: 'user', select: 'name email contact image' }).lean(),
            reportQuery.getPaginationInfo()
        ])

        await this.cacheService.set('report', { reports, pagination }, 360, query)

        return {
            reports,
            pagination
        }
    }

    async getSingleReport(reportId: string) {
        const report = await this.reportModel.findById(reportId)
            .populate('user', 'name email contact image')
            .populate('booking', '')
            .populate('trip', 'id departure_address return_address departure_date return_date transport_type available_space_kg pricing_details departure_location return_location createdAt')
            .populate('transporter', 'name email contact image')
            .populate('receiver', 'name email contact image')
        return sendResponse({
            message: 'report fetched successfully',
            success: true,
            statusCode: 200,
            data: report
        })
    }

    async updateReport(reportId: string, data: any) {
        const updatedReport = await this.reportModel.findByIdAndUpdate(reportId, data, { new: true })
        await this.cacheService.deleteByPattern('report')
        return sendResponse({
            message: 'report updated successfully',
            success: true,
            statusCode: 200,
            data: updatedReport
        })
    }

    async deleteReport(reportId: string) {
        await this.reportModel.findByIdAndDelete(reportId)
        await this.cacheService.deleteByPattern('report')
        return sendResponse({
            message: 'report deleted successfully',
            success: true,
            statusCode: 200,
        })
    }


    async createReportFromAdmin(report: CreateReportDto, user: any) {
        const booking = await this.bookingModel.findOne({ id: report.booking })

        if (!booking) {
            throw new ApiError(404, 'Booking not found')
        }

        report.trip = booking.trip
        report.transporter = booking.transporter
        report.receiver = booking.receiver
        report.booking = booking._id as any
        const createdReport = await this.reportModel.create({
            ...report,
            user
        })
        await Promise.all([
            this.snsService.publish('chat.report.create', createdReport),
            this.snsService.publish<CreateNotificationDto>('notification.send', {
                title: `Report Against ${createdReport.report_type}`,
                message: `Admins are carefully take care of your case`,
                isRead: false,
                receiver: [report.user],
                filePath: FilePathType.REPORT,
                referenceId: createdReport._id.toString(),
            }),
            this.snsService.publish<CreateNotificationDto>('notification.send', {
                title: 'New report has been submitted',
                message: `${createdReport.report_id} has been submitted. please check it.`,
                isRead: false,
                filePath: FilePathType.REPORT,
                referenceId: createdReport._id.toString(),
            }),
            this.snsService.publish<CreateAuditLogsDto>('audit.create', {
                action: 'Report Submitted',
                user: user as any,
                old_value: ``,
                new_value: ``,
                reason: report.description
            })
        ]);
        await this.cacheService.deleteByPattern('report')
        return sendResponse({
            message: 'report created successfully',
            success: true,
            statusCode: 200,
            data: createdReport
        })
    }


    async createChatWithSupport(userId: string) {
        const existingChat = await this.chatModel.findOne({
            participants: { $in: [userId] },
            is_support_message: true
        })
        if (existingChat) {
            return sendResponse({
                message: 'Chat already exists',
                success: true,
                statusCode: 200,
                data: existingChat
            })
        }

        const createdChat = await this.chatModel.create({
            participants: [userId],
            is_support_message: true,

        })
        return sendResponse({
            message: 'Chat created successfully',
            success: true,
            statusCode: 200,
            data: createdChat
        })
    }

    async refundRequestForAdmin(payload: RefundOnReportDto, userId: string) {
        const report = await this.reportModel.findById(payload.report)
        if (!report) {
            throw new ApiError(404, 'Report not found')
        }
        if (report.is_refunded) {
            throw new ApiError(400, 'Report is already resolved')
        }

        const bookingInfo = await this.bookingModel.findById(report.booking)
        if (!bookingInfo) {
            throw new ApiError(404, 'Booking not found')
        }

        if (payload.amount > bookingInfo.price_breakdown?.total) {
            throw new ApiError(400, 'Refund amount is greater than booking amount')
        }

        // if (bookingInfo.payment_intent_id) {
        //     await this.stripeService.getClient().refunds.create({
        //         payment_intent: bookingInfo.payment_intent_id,
        //         amount: Math.round(payload.amount * 100),
        //         reason: "requested_by_customer",
        //         metadata: {
        //             refund_request_id: report._id.toString(),
        //             amount: payload.amount,
        //             report_id: report.report_id,
        //         }
        //     })

        //     await this.reportModel.findByIdAndUpdate(report._id, {
        //         is_refunded: true,
        //         refund_reason: payload.reason,
        //         refunded_amount: payload.amount,
        //     })

        //     await this.snsService.publish<CreateAuditLogsDto>('audit.create', {
        //         action: 'Refund Request',
        //         old_value: report.status,
        //         new_value: 'resolved',
        //         reason: payload.reason,
        //         user: userId as any
        //     })

        //     await this.snsService.publish<CreateNotificationDto>('notification.send', {
        //         title: 'Refund Request',
        //         message: `Your refund request has been processed successfully.`,
        //         isRead: false,
        //         receiver: [report.user as any],
        //         filePath: FilePathType.REPORT,
        //         referenceId: report._id.toString(),
        //     })

        //     await this.cacheService.deleteByPattern('report')

        //     return sendResponse({
        //         message: 'Refund request sent successfully',
        //         success: true,
        //         statusCode: 200,
        //     })
        // }

        await this.snsService.publish<{ userId: string, amount: number }>('add.balance', {
            userId: payload.user_id,
            amount: payload.amount,
        })

        await this.reportModel.findByIdAndUpdate(report._id, {
            is_refunded: true,
            refund_reason: payload.reason,
            refunded_amount: payload.amount,
        })

        await this.snsService.publish<CreateAuditLogsDto>('audit.create', {
            action: 'Refund Request',
            old_value: report.status,
            new_value: 'resolved',
            reason: payload.reason,
            user: userId as any
        })

        await this.snsService.publish<CreateNotificationDto>('notification.send', {
            title: 'Refund Request',
            message: `Admin has added ${payload.amount} to your wallet for refund request.`,
            isRead: false,
            receiver: [payload.user_id as any],
            filePath: FilePathType.REPORT,
            referenceId: report._id.toString(),
        })

        await this.cacheService.deleteByPattern('report')

        return sendResponse({
            message: 'Refund request sent successfully',
            success: true,
            statusCode: 200,
        })




    }

    async getReportsUsersByReportId(reportId: string) {
        const report: any = await this.reportModel.findById(reportId).select('booking').populate({
            path: 'booking',
            select: 'receiver transporter sender user',
            populate: [
                {
                    path: 'receiver transporter sender user',
                    select: 'name phone email image'
                }
            ]
        })

        if (!report) {
            throw new ApiError(404, 'Report not found')
        }
        return sendResponse({
            message: 'report fetched successfully',
            success: true,
            statusCode: 200,
            data: [
                report.booking?.receiver,
                report.booking?.transporter,
                report.booking?.sender,
                report.user
            ].filter(Boolean)
        })
    }





}

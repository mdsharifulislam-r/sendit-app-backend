import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from './report.entity';
import { CreateReportDto } from './report.dto';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { S3Service } from 'utils/helper-modules/upload/s3.service';
import sendResponse from 'utils/helper/sendResponse';
import { CreateNotificationDto, FilePathType } from '../communication.dto';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { CreateAuditLogsDto } from 'apps/admin/src/audit-logs/audit-logs.dto';

@Injectable()
export class ReportService {
    constructor(
        @InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>,
        private readonly snsService: SnsService,
        private readonly s3Service: S3Service,
        private readonly cacheService: CacheService
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
        const report = await this.reportModel.findById(reportId).populate('user', 'name email contact image')
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


}

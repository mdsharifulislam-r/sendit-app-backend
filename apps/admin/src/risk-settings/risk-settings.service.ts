import { HttpStatus, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { RiskSettings, RiskyItems } from './risk-settings.entity';
import { InjectModel } from '@nestjs/mongoose';
import { CreateRiskSettingsDto, CreateRiskyItems, RISKY_ITEM_STATUS } from './risk-settings.dto';
import sendResponse from 'utils/helper/sendResponse';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateAuditLogsDto } from '../audit-logs/audit-logs.dto';
import { CreateNotificationDto, FilePathType } from 'apps/communication/src/communication.dto';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { ApiError } from 'utils/errors/api-error';

@Injectable()
export class RiskSettingsService {
    constructor(
        @InjectModel(RiskSettings.name) private riskSettingsModel: Model<RiskSettings>,
        @InjectModel(RiskyItems.name) private riskyItemsModel: Model<RiskyItems>,
        private readonly snsService: SnsService
    ) { }

    async createRiskSettings(userId: string, createRiskSettingsDto: CreateRiskSettingsDto) {
        const isExist = await this.riskSettingsModel.findOne()
        if (isExist) {
            await this.riskSettingsModel.updateOne(createRiskSettingsDto)
            await this.snsService.publish<CreateAuditLogsDto>('audit.create', {
                action: 'Risk Settings Updated',
                user: userId as any,
                old_value: '',
                new_value: '',
                reason: 'Risk settings updated successfully',
            })
            return sendResponse({
                message: "Risk settings updated successfully",
                statusCode: HttpStatus.OK,
                success: true,
                data: createRiskSettingsDto
            })
        }
        const create = await this.riskSettingsModel.create(createRiskSettingsDto)
        await this.snsService.publish<CreateAuditLogsDto>('audit.create', {
            action: 'Risk Settings Created',
            user: userId as any,
            old_value: '',
            new_value: '',
            reason: 'Risk settings created successfully',
        })
        return sendResponse({
            message: "Risk settings created successfully",
            statusCode: HttpStatus.CREATED,
            success: true,
            data: create
        })

    }

    async getRiskSettings() {
        const riskSettings = await this.riskSettingsModel.findOne()
        return sendResponse({
            message: "Risk settings fetched successfully",
            statusCode: HttpStatus.OK,
            success: true,
            data: riskSettings || {}
        })
    }

    @SqsConsumer('risk.item.create')
    async createRiskyItem(payload: CreateRiskyItems) {
        try {
            const create = await this.riskyItemsModel.create(payload)
            await this.snsService.publish<CreateNotificationDto>('notification.send', {
                title: 'New Risky Item Detected',
                message: `A new risky item has been added to the risky items list.`,
                isRead: false,
                filePath: FilePathType.RISKY_ITEM,
                referenceId: create._id as any,
            })
        } catch (error) {
            console.log(error)

        }
    }

    @SqsConsumer('audit.log.create')
    async createAuditLogs(payload: CreateAuditLogsDto) {
        try {
            console.log(payload)
        } catch (error) {
            console.log(error)

        }
    }

    getAllRiskyItems = async (query: Record<string, any>) => {
        const riskyQuery = new QueryBuilder(this.riskyItemsModel.find(), query).filter().paginate().sort()

        const [data, pagination] = await Promise.all([riskyQuery.modelQuery.populate('item', 'name id image title amount trx_id email'), riskyQuery.getPaginationInfo()])

        return { data, pagination }

    }


    async changeStatusOfItems(id: string, status: RISKY_ITEM_STATUS, userId: string) {
        const item = await this.riskyItemsModel.findById(id)
        if (!item) {
            throw new ApiError(HttpStatus.NOT_FOUND, "Item not found")
        }
        if (item.status === status) {
            throw new ApiError(HttpStatus.BAD_REQUEST, "Item already in this status")
        }

        if (item.status != RISKY_ITEM_STATUS.PENDNIG) {
            throw new ApiError(HttpStatus.BAD_REQUEST, "Item is not in pending state")
        }
        item.status = status
        await item.save()
        this.snsService.publish<CreateAuditLogsDto>('audit.create', {
            action: "Risk Item Status Changed",
            user: userId as any,
            old_value: 'Pending',
            new_value: status,
            reason: `Make this item ${status}`,
        })
        return sendResponse({
            message: "Item status changed successfully",
            statusCode: HttpStatus.OK,
            success: true,
            data: item
        })
    }


}

import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Device, DeviceDocument } from './device.entity';
import { Model } from 'mongoose';
import { CreateDeviceDto } from './device.dto';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import sendResponse from 'utils/helper/sendResponse';
import { ApiError } from 'utils/errors/api-error';
import { CacheService } from 'utils/helper-modules/cache/cache.service';

@Injectable()
export class DeviceService {
    constructor(
        @InjectModel(Device.name) private readonly deviceModel: Model<DeviceDocument>,
        private readonly cacheService: CacheService,
    ) { }

    @SqsConsumer('device.create')
    async saveDevice(payload: CreateDeviceDto) {
        const existsDevice = await this.deviceModel.findOne({
            user: payload.user,
            device_id: payload.device_id,
        }).lean();

        if (existsDevice) {
            return this.deviceModel.updateOne(
                { _id: existsDevice._id },
                {
                    $set: {
                        ...payload, location: {
                            type: "Point",
                            coordinates: [payload.location.longitude, payload.location.latitude]
                        }, status: "active"
                    }
                }
            )
        }
        const device = new this.deviceModel({
            ...payload,
            location: {
                type: "Point",
                coordinates: [payload.location.longitude, payload.location.latitude]
            },
            status: "active"
        })
        console.log(`====================> new device saved`, payload)
        return await device.save()
    }

    async getLoginDevices(userId: string, query: Record<string, any>) {
        const deviceQuery = new QueryBuilder(this.deviceModel.find({ user: userId }), query).paginate().sort()
        const [devices, pagination] = await Promise.all([
            deviceQuery.modelQuery.lean(),
            deviceQuery.getPaginationInfo()
        ])

        return sendResponse({
            statusCode: HttpStatus.OK,
            message: 'Devices fetched successfully',
            data: devices,
            pagination: pagination,
            success: true,
        })

    }

    async logoutDevice(deviceId: string, userId: string) {
        await this.deviceModel.updateOne({
            device_id: deviceId,
            user: userId,
            status: "active"
        }, { $set: { status: "inactive" } })

        return sendResponse({
            statusCode: HttpStatus.OK,
            message: 'Device logged out successfully',
            data: {},
            success: true,
        })
    }

    async removeDevice(deviceId: string, userId: string) {
        const device = await this.deviceModel.findOne({
            device_id: deviceId,
            user: userId,
        })
        if (!device) {
            throw new ApiError(404, "Device not found")
        }
        await this.deviceModel.findOneAndUpdate({
            device_id: deviceId,
            user: userId,
        }, { $set: { status: "blocked" } })
        await this.cacheService.set(`blocked_device:${userId}:${deviceId}`, { isBlocked: true }, 60 * 60 * 24)
        return sendResponse({
            statusCode: HttpStatus.OK,
            message: 'Device removed successfully',
            data: {},
            success: true,
        })
    }
}

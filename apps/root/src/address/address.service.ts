import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Address, AddressDocument } from './address.entity';
import { Model } from 'mongoose';
import { CreateAddressDto, UpdateAddressDto } from './address.dto';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { ApiError } from 'utils/errors/api-error';
import sendResponse from 'utils/helper/sendResponse';

@Injectable()
export class AddressService {
    constructor(
        @InjectModel(Address.name)
        private readonly addressModel: Model<AddressDocument>,

    ) { }

    async createUserAddress(address: CreateAddressDto, userId: string) {
        const userAddress = await this.addressModel.create({
            ...address,
            user: userId,
            location: {
                type: "Point",
                coordinates: [address.longitude, address.latitude]
            }

        })
        return sendResponse({
            statusCode: HttpStatus.CREATED,
            message: "Address created successfully",
            success: true,
            data: null
        })
    }


    async getUserAddresses(userId: string, query: Record<string, any>) {
        const addressQuery = new QueryBuilder(this.addressModel.find({ user: userId }), query).filter().sort().search(['address']).paginate()
        const [addresses, pagination] = await Promise.all([addressQuery.modelQuery.lean(), addressQuery.getPaginationInfo()])

        return { addresses, pagination }
    }

    async updateAddress(id: string, payload: UpdateAddressDto) {
        const address = await this.addressModel.findById(id);

        if (!address) {
            throw new ApiError(HttpStatus.NOT_FOUND, "Address not found")
        }

        await this.addressModel.findByIdAndUpdate(id, {
            ...payload,
            ...(payload.latitude && payload.longitude && {
                location: {
                    type: "Point",
                    coordinates: [payload.longitude, payload.latitude]
                }
            })
        })

        return sendResponse({
            statusCode: HttpStatus.OK,
            message: "Address updated successfully",
            success: true,
            data: null
        })
    }

    async deleteAddress(id: string) {
        const address = await this.addressModel.findById(id);

        if (!address) {
            throw new ApiError(HttpStatus.NOT_FOUND, "Address not found")
        }

        await this.addressModel.findByIdAndDelete(id)

        return sendResponse({
            statusCode: HttpStatus.OK,
            message: "Address deleted successfully",
            success: true,
            data: null
        })
    }





}

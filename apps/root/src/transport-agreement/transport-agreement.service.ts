import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransportAgreement } from './transport-agreement.entity';
import { AGREEMENT_VALIDITY, CreateTransportAgreementDto } from './transport-agreement.dto';
import { ApiError } from 'utils/errors/api-error';
import sendResponse from 'utils/helper/sendResponse';


@Injectable()
export class TransportAgreementService {
    constructor(
        @InjectModel(TransportAgreement.name)
        private readonly transportAgreementModel: Model<TransportAgreement>,
    ) { }

    async checkAgreement(userId: string) {
        const agreement = await this.transportAgreementModel.findOne({ user: userId, valid_until: { $gte: new Date() } })
        if (!agreement) {
            return false
        }

        return true

    }

    async signAgreement(payload: CreateTransportAgreementDto, userId: string) {
        const check = await this.transportAgreementModel.findOne({ user: userId, valid_until: { $gte: new Date() } })
        if (check) {
            throw new ApiError(400, 'You already have a valid agreement')
        }

        const agreement = await this.transportAgreementModel.create({
            user: userId,
            ...payload
        })

        return sendResponse({
            message: 'Agreement signed successfully',
            statusCode: HttpStatus.OK,
            data: agreement,
            success: true,

        })
    }

    async deleteOneTimeTripAgreement(userid: string) {
        await this.transportAgreementModel.deleteMany({ user: userid, validity: AGREEMENT_VALIDITY.VALID_FOR_ONE_TRIP })
        return true
    }
}

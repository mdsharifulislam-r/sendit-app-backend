import { Injectable } from '@nestjs/common';
import { CreateDisclaimerDto, DISCLAIMER_TYPE } from './disclaimer.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Disclaimer, DisclaimerDocument } from './disclaimer.entity';
import { Model } from 'mongoose';
import { CacheService } from 'utils/helper-modules/cache/cache.service';

@Injectable()
export class DisclaimerService {
    constructor(
        @InjectModel(Disclaimer.name)
        private disclaimerModel: Model<DisclaimerDocument>,
        private readonly cacheService: CacheService
    ) { }

    async createDisclaimer(createDisclaimerDto: CreateDisclaimerDto) {
        const isExist = await this.disclaimerModel.findOne({ type: createDisclaimerDto.type });
        if (isExist) {
            await this.disclaimerModel.findByIdAndUpdate(isExist._id, createDisclaimerDto);
            await this.cacheService.set(`disclaimer:${createDisclaimerDto.type}`, createDisclaimerDto.content, 60 * 60 * 24);
            return;
        }
        const disclaimer = new this.disclaimerModel(createDisclaimerDto);
        await this.cacheService.set(`disclaimer:${createDisclaimerDto.type}`, createDisclaimerDto.content, 60 * 60 * 24);
        return await disclaimer.save();
    }

    async getDisclaimerByType(type: DISCLAIMER_TYPE) {
        const cachedData = await this.cacheService.get(`disclaimer:${type}`);
        if (cachedData) return cachedData;
        const disclaimer = await this.disclaimerModel.findOne({ type });
        await this.cacheService.set(`disclaimer:${type}`, disclaimer?.content, 60 * 60 * 24);
        return disclaimer?.content;
    }
}

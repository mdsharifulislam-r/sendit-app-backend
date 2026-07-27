import { Injectable } from '@nestjs/common';
import { CreateDisclaimerDto, DISCLAIMER_TYPE } from './disclaimer.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Disclaimer, DisclaimerDocument } from './disclaimer.entity';
import { Model } from 'mongoose';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateAuditLogsDto } from 'apps/admin/src/audit-logs/audit-logs.dto';

@Injectable()
export class DisclaimerService {
    constructor(
        @InjectModel(Disclaimer.name)
        private disclaimerModel: Model<DisclaimerDocument>,
        private readonly cacheService: CacheService,
        private readonly snsService: SnsService
    ) { }

    async createDisclaimer(createDisclaimerDto: CreateDisclaimerDto, userId: string) {
        const isExist = await this.disclaimerModel.findOne({ type: createDisclaimerDto.type });
        if (isExist) {
            await this.disclaimerModel.findByIdAndUpdate(isExist._id, createDisclaimerDto);
            await this.cacheService.set(`disclaimer:${createDisclaimerDto.type}`, createDisclaimerDto.content, 60 * 60 * 24);
            this.snsService.publish<CreateAuditLogsDto>('audit.create', {
                action: `Updated ${createDisclaimerDto.type} disclaimer`,
                user: userId as any,
                old_value: isExist.content.slice(0, 20),
                new_value: createDisclaimerDto.content.slice(0, 20),
                reason: `Updated ${createDisclaimerDto.type} disclaimer`
            })

            return;
        }
        const disclaimer = await this.disclaimerModel.create(createDisclaimerDto);
        await this.cacheService.set(`disclaimer:${createDisclaimerDto.type}`, createDisclaimerDto.content, 60 * 60 * 24);
        this.snsService.publish<CreateAuditLogsDto>('audit.create', {
            action: `Created ${createDisclaimerDto.type} disclaimer`,
            user: userId as any,
            old_value: `No ${createDisclaimerDto.type} disclaimer`,
            new_value: createDisclaimerDto.content.slice(0, 20)!,
            reason: `Created ${createDisclaimerDto.type} disclaimer`
        })

    }

    async getDisclaimerByType(type: DISCLAIMER_TYPE) {
        const cachedData = await this.cacheService.get(`disclaimer:${type}`);
        if (cachedData) return cachedData;
        const disclaimer = await this.disclaimerModel.findOne({ type });
        await this.cacheService.set(`disclaimer:${type}`, disclaimer?.content, 60 * 60 * 24);
        return disclaimer?.content;
    }
}

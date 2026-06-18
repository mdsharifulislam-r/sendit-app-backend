import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PricingRules } from './pricing-rules.entity';
import { Model } from 'mongoose';
import { CreatePricingRulesDto } from './pricing-rules.dto';
import sendResponse from 'utils/helper/sendResponse';

@Injectable()
export class PricingRulesService {
    constructor(@InjectModel(PricingRules.name) private readonly pricingRulesModel: Model<PricingRules>) { }

    async createPricingRules(dto: CreatePricingRulesDto) {
        const { platform_fee, tax_amount } = dto
        const existingPricingRules = await this.pricingRulesModel.findOne()
        if (existingPricingRules) {
            existingPricingRules.platform_fee = platform_fee
            existingPricingRules.tax_amount = tax_amount
            return await existingPricingRules.save()
        }
        const res = await this.pricingRulesModel.create({ platform_fee, tax_amount })
        return sendResponse({
            message: 'Pricing rules updated successfully',
            success: true,
            statusCode: 200,
            data: res
        })
    }

    async getPricingRules() {
        const pricingRules = await this.pricingRulesModel.findOne()
        return sendResponse({
            message: 'Pricing rules fetched successfully',
            success: true,
            statusCode: 200,
            data: pricingRules || {
                platform_fee: 0,
                tax_amount: 0
            }
        })
    }

    async calculatePricingFare(subtotal: number, discount: number = 0) {
        let platform_fee = await this.pricingRulesModel.findOne()
        if (!platform_fee) {
            platform_fee = {
                platform_fee: 0,
                tax_amount: 0
            } as any
        }

        if (!discount) {
            const platform_charge = subtotal * ((platform_fee?.platform_fee || 0) / 100)
            const tax_amount = subtotal * ((platform_fee?.tax_amount || 0) / 100)
            return {
                subtotal: subtotal,
                discount: 0,
                platform_fee: platform_charge,
                tax: tax_amount,
                total: subtotal + platform_charge + tax_amount,
            }
        }

        const total = subtotal - discount
        const platform_charge = total * ((platform_fee?.platform_fee || 0) / 100)
        const tax_amount = total * ((platform_fee?.tax_amount || 0) / 100)
        return {
            subtotal: subtotal,
            discount: discount,
            platform_fee: platform_charge,
            tax: tax_amount,
            total: total + platform_charge + tax_amount,
        }
    }


}

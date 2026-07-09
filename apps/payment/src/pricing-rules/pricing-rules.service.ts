import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PricingRules } from './pricing-rules.entity';
import { Model } from 'mongoose';
import { CreatePricingRulesDto } from './pricing-rules.dto';
import sendResponse from 'utils/helper/sendResponse';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateAuditLogsDto } from 'apps/admin/src/audit-logs/audit-logs.dto';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';

@Injectable()
export class PricingRulesService {
    constructor(@InjectModel(PricingRules.name) private readonly pricingRulesModel: Model<PricingRules>,
        private readonly snsService: SnsService

    ) { }

    async createPricingRules(dto: CreatePricingRulesDto, userId: string) {
        const { platform_fee, tax_amount } = dto
        const existingPricingRules = await this.pricingRulesModel.findOne()
        if (existingPricingRules) {
            existingPricingRules.platform_fee = platform_fee
            existingPricingRules.tax_amount = tax_amount
            existingPricingRules.withdraw_fee = dto.withdraw_fee
            existingPricingRules.min_withdraw_amount = dto.min_withdraw_amount
            const res = await existingPricingRules.save()
            this.snsService.publish<CreateAuditLogsDto>("audit.create", {
                action: "Pricing rules updated",
                user: userId as any,
                old_value: normalizeObjectInString({
                    platform_fee: existingPricingRules.platform_fee,
                    tax_amount: existingPricingRules.tax_amount,
                    withdraw_fee: existingPricingRules.withdraw_fee,
                    min_withdraw_amount: existingPricingRules.min_withdraw_amount
                }),
                new_value: normalizeObjectInString({
                    platform_fee: res.platform_fee,
                    tax_amount: res.tax_amount,
                    withdraw_fee: res.withdraw_fee,
                    min_withdraw_amount: res.min_withdraw_amount
                }),
                reason: "Pricing rules updated"
            })
            return sendResponse({
                message: 'Pricing rules updated successfully',
                success: true,
                statusCode: 200,
                data: res
            })
        }
        const res = await this.pricingRulesModel.create({ platform_fee, tax_amount, withdraw_fee: dto.withdraw_fee, min_withdraw_amount: dto.min_withdraw_amount })
        this.snsService.publish<CreateAuditLogsDto>("audit.create", {

            action: "Pricing rules created",
            user: userId as any,
            old_value: normalizeObjectInString({
                platform_fee: 0,
                tax_amount: 0,
                withdraw_fee: 0,
                min_withdraw_amount: 0
            }),
            new_value: normalizeObjectInString({
                platform_fee: res.platform_fee,
                tax_amount: res.tax_amount,
                withdraw_fee: res.withdraw_fee,
                min_withdraw_amount: res.min_withdraw_amount
            }),
            reason: "Pricing rules created"
        })
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

    async calculatePricingFare(subtotal: number, discount = 0) {
        const pricingRule = await this.pricingRulesModel.findOne();

        const platformFeePercentage = pricingRule?.platform_fee ?? 0;
        const taxPercentage = pricingRule?.tax_amount ?? 0;

        // Prevent negative totals
        discount = Math.max(0, Math.min(discount, subtotal));

        const taxableSubtotal = subtotal - discount;

        const round = (value: number) => Number(value.toFixed(2));

        // Charges after discount
        const platformFee = round(
            taxableSubtotal * (platformFeePercentage / 100),
        );

        const tax = round(
            taxableSubtotal * (taxPercentage / 100),
        );

        const total = round(
            taxableSubtotal + platformFee + tax,
        );

        // Original total without discount
        const originalPlatformFee = round(
            subtotal * (platformFeePercentage / 100),
        );

        const originalTax = round(
            subtotal * (taxPercentage / 100),
        );

        const withoutDiscountTotal = round(
            subtotal + originalPlatformFee + originalTax,
        );

        return {
            subtotal: round(subtotal),
            discount: round(discount),
            platform_fee: platformFee,
            tax,
            total,
            without_discount_total: withoutDiscountTotal,
        };
    }


}

// its will be look like name=value
function normalizeObjectInString(obj: Record<string, any>) {
    return Object.keys(obj).map(key => `${key}=${obj[key]}`).join(' ')
}
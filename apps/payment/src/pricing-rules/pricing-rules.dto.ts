import { IsEnum, IsNotEmpty, IsNumber, IsPositive } from "class-validator";


export class CreatePricingRulesDto {
    @IsNumber()
    @IsNotEmpty()
    @IsPositive({ message: 'Platform fee must be a positive number' })
    platform_fee: number

    @IsNumber()
    @IsPositive({ message: 'Tax amount must be a positive number' })
    @IsNotEmpty()
    tax_amount: number
}
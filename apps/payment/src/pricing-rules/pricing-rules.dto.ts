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

    @IsNumber()
    @IsPositive({ message: 'Withdraw fee must be a positive number' })
    @IsNotEmpty()
    withdraw_fee: number

    @IsNumber()
    @IsPositive({ message: 'Minimum withdraw amount must be a positive number' })
    @IsNotEmpty()
    min_withdraw_amount: number
}
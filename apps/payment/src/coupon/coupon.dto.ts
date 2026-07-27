import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsPositive, Max } from "class-validator";
import { Refine } from "utils/decorators/refine.decorator";

export class CreateCouponDto {
    @ApiProperty({
        example: 'SUMMER_SALE',
        required: true,
        description: "Coupon code",
    })
    @IsNotEmpty({ message: "Coupon code is required" })
    code: string


    @ApiProperty({
        example: 'Coupon',
        required: true,
        description: "Coupon type",
        enum: ["Coupon", "Referral"]
    })
    @IsNotEmpty({ message: "Coupon type is required" })
    @IsEnum(["Coupon", "Referral"])
    type: "Coupon" | "Referral"

    @ApiProperty({
        example: 'Summer Sale',
        required: true,
        description: "Coupon name",
    })
    @IsNotEmpty({ message: "Coupon name is required" })
    name: string


    @ApiProperty({
        example: "fixed",
        required: true,
        description: "Coupon type",
        enum: ["fixed", "percentage"]
    })
    @IsNotEmpty({ message: "Coupon type is required" })
    @IsEnum(["fixed", "percentage"])
    coupon_type: "fixed" | "percentage"

    @ApiProperty({
        example: 50,
        required: true,
        description: "Coupon discount percentage",
    })
    @IsOptional()
    @IsNumber({}, { message: "Coupon discount percentage must be a number" })
    @IsPositive({ message: "Coupon discount percentage must be greater than 0" })
    @Max(100, { message: "Coupon discount percentage must be less than or equal to 100" })
    discount_percentage: number

    @ApiProperty({
        example: 500,
        required: true,
        description: "Coupon discount amount",
    })
    @IsOptional()
    @IsNumber({}, { message: "Coupon discount amount must be a number" })
    @IsPositive({ message: "Coupon discount amount must be greater than 0" })
    discount_amount: number


    @ApiProperty({
        example: '2026-12-31',
        required: true,
        description: "Coupon start date",
    })
    @IsNotEmpty({ message: "Coupon start date is required" })
    @IsDateString()
    @Refine({
        validator: (value: any, args: any) => {
            const date = new Date(value)
            if (date <= new Date()) {
                return false
            }
            return true
        },
        message: "Coupon expiry date must be greater than current date"
    })
    startDate: Date

    @ApiProperty({
        example: '2026-12-31',
        required: true,
        description: "Coupon expiry date",
    })
    @IsNotEmpty({ message: "Coupon expiry date is required" })
    @IsDateString()
    @Refine({
        validator: (value: any, args: any) => {
            const date = new Date(value)
            if (date <= new Date()) {
                return false
            }
            return true
        },
        message: "Coupon expiry date must be greater than current date"
    })
    expiry_date: string

    @ApiProperty({
        example: 10,
        required: true,
        description: "Coupon max usage",
    })
    @IsOptional()
    @IsNumber({}, { message: "Coupon max usage must be a number" })
    @IsPositive({ message: "Coupon max usage must be greater than 0" })
    max_usage: number

    @IsNumber({}, { message: "Refferar amount must be a number" })
    @IsPositive({ message: "Refferar amount must be greater than 0" })
    @IsOptional()
    refferar_amount: number

    @IsNumber({}, { message: "Reffree amount must be a number" })
    @IsPositive({ message: "Reffree amount must be greater than 0" })
    @IsOptional()
    reffree_amount: number
}

export class UpdateCouponDto {
    @ApiProperty({
        example: 'SUMMER_SALE',
        required: false,
        description: "Coupon code",
    })
    @IsOptional()
    @IsNotEmpty({ message: "Coupon code is required" })
    code: string

    @ApiProperty({
        example: 'Summer Sale',
        required: false,
        description: "Coupon name",
    })
    @IsOptional()
    @IsNotEmpty({ message: "Coupon name is required" })
    name: string

    @ApiProperty({
        example: "fixed",
        required: false,
        description: "Coupon type",
        enum: ["fixed", "percentage"]
    })
    @IsOptional()
    @IsNotEmpty({ message: "Coupon type is required" })
    @IsEnum(["fixed", "percentage"])
    coupon_type: "fixed" | "percentage"

    @ApiProperty({
        example: 50,
        required: false,
        description: "Coupon discount percentage",
    })
    @IsOptional()
    @IsNumber({}, { message: "Coupon discount percentage must be a number" })
    @IsPositive({ message: "Coupon discount percentage must be greater than 0" })
    @Max(100, { message: "Coupon discount percentage must be less than or equal to 100" })
    discount_percentage: number

    @ApiProperty({
        example: 500,
        required: false,
        description: "Coupon discount amount",
    })
    @IsOptional()
    @IsNumber({}, { message: "Coupon discount amount must be a number" })
    @IsPositive({ message: "Coupon discount amount must be greater than 0" })
    discount_amount: number

    @ApiProperty({
        example: '2026-12-31',
        required: false,
        description: "Coupon expiry date",
    })
    @IsOptional()
    @IsNotEmpty({ message: "Coupon expiry date is required" })
    @IsDateString()
    @Refine({
        validator: (value: any, args: any) => {
            const date = new Date(value)
            if (date <= new Date()) {
                return false
            }
            return true
        },
        message: "Coupon expiry date must be greater than current date"
    })
    expiry_date: string

    @ApiProperty({
        example: 10,
        required: false,
        description: "Coupon max usage",
    })
    @IsOptional()
    @IsNumber({}, { message: "Coupon max usage must be a number" })
    @IsPositive({ message: "Coupon max usage must be greater than 0" })
    max_usage: number

    @ApiProperty({
        example: "Coupon",
        required: false,
        description: "Coupon type",
        enum: ["Coupon", "Referral"]
    })
    @IsOptional()
    @IsEnum(["Coupon", "Referral"])
    type: "Coupon" | "Referral"

    @ApiProperty({
        example: 10,
        required: false,
        description: "Refferar amount",
    })
    @IsOptional()
    @IsNumber({}, { message: "Refferar amount must be a number" })
    @IsPositive({ message: "Refferar amount must be greater than 0" })
    refferar_amount: number

    @ApiProperty({
        example: 10,
        required: false,
        description: "Reffree amount",
    })
    @IsOptional()
    @IsNumber({}, { message: "Reffree amount must be a number" })
    @IsPositive({ message: "Reffree amount must be greater than 0" })
    reffree_amount: number
}


export class CheckCouponDto {
    @ApiProperty({
        example: 'SUMMER_SALE',
        required: true,
        description: "Coupon code",
    })
    @IsNotEmpty({ message: "Coupon code is required" })
    code: string

    @ApiProperty({
        example: "500",
        required: true,
        description: "Service charge amount",
    })
    @IsNotEmpty()
    @IsNumberString({}, { message: "Amount must be a number" })
    amount: string
}
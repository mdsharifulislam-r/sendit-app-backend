import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { Types } from "mongoose";

export class CreateRiskSettingsDto {
    @ApiProperty({
        example: 5000,
        description: 'High value threshold',
        required: true
    })
    @IsNumber({},
        { message: 'High value threshold must be a number' })
    @IsNotEmpty({
        message: 'High value threshold is required'
    })
    high_value_threshold: number;

    @ApiProperty({
        example: 3,
        description: 'Maximum failed KYC attempts',
        required: true
    })
    @IsNumber({},
        { message: 'Maximum failed KYC attempts must be a number' })
    @IsNotEmpty({
        message: 'Maximum failed KYC attempts is required'
    })
    max_failed_kyc_attempts: number;

    @ApiProperty({
        example: 70,
        description: 'Auto flag weight threshold',
        required: true
    })
    @IsNumber({},
        { message: 'Auto flag weight threshold must be a number' })
    @IsNotEmpty({
        message: 'Auto flag weight threshold is required'
    })
    auto_flag_weight_threshold: number;

    @ApiProperty({
        example: 24,
        description: 'Rapid transaction window in hours',
        required: true
    })
    @IsNumber({},
        { message: 'Rapid transaction window hours must be a number' })
    @IsNotEmpty({
        message: 'Rapid transaction window hours is required'
    })
    rapid_transaction_window_hours: number

}

export enum RISK_ITEM_TYPE {
    USER = "User",
    TRANSACTION = "Transaction",
    TRIP = "Trip"
}

export enum RISKY_ITEM_STATUS {
    PENDNIG = "Pending",
    CLEAR = "Clear",
    BLACKLIST = "Blacklist"
}

export class CreateRiskyItems {
    type: RISK_ITEM_TYPE;
    description: string;
    item: Types.ObjectId;
    status: RISKY_ITEM_STATUS;

}


export class ChangeStatusOfItemsDto {
    @ApiProperty({
        example: RISKY_ITEM_STATUS.PENDNIG,
        description: 'Status of the risky item',
        required: true
    })
    @IsEnum(RISKY_ITEM_STATUS)
    @IsNotEmpty({
        message: 'Status is required'
    })
    status: RISKY_ITEM_STATUS
}
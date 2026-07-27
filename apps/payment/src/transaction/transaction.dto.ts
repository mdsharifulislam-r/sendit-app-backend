import {
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
} from "class-validator";
import {
    TRANSACTION_STATUS,
    TRANSACTION_TYPE,
    TRANSACTION_PAYMENT_TYPE,
} from "./transaction.entity";

export class CreateTransactionDto {
    @IsString()
    title: string;

    @IsUUID()
    ownerId: string;

    @IsString()
    trx_id: string;

    @IsNumber()
    amount: number;

    @IsOptional()
    @IsNumber()
    platform_charge?: number;

    @IsOptional()
    @IsNumber()
    discount?: number;

    @IsOptional()
    @IsNumber()
    tax?: number;

    @IsOptional()
    @IsUUID()
    bookingId?: string;

    @IsOptional()
    @IsUUID()
    transporterId?: string;

    @IsOptional()
    @IsUUID()
    travelerId?: string;

    @IsEnum(TRANSACTION_STATUS)
    @IsOptional()
    status?: TRANSACTION_STATUS;

    @IsEnum(TRANSACTION_PAYMENT_TYPE)
    payment_status: TRANSACTION_PAYMENT_TYPE;

    @IsOptional()
    @IsString()
    prev_trx_id?: string;

    @IsEnum(TRANSACTION_TYPE)
    type: TRANSACTION_TYPE;
}
import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, MAX, Min } from "class-validator";
import { Types } from "mongoose";

export class CreateReportDto {
    @IsString()
    report_type: string

    @IsString()
    description: string

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    attachments: string[]

    @IsString()
    @IsOptional()
    booking: string

    trip: Types.ObjectId
    transporter: Types.ObjectId
    receiver: Types.ObjectId

    @IsString()
    @IsMongoId()
    user: string
}


export class RefundOnReportDto {
    @IsMongoId()
    report: string

    @IsNumber()
    @Min(0, { message: 'Refund amount must be greater than 0' })
    amount: number

    @IsMongoId()
    user_id: string

    @IsString()
    @IsOptional()
    reason: string
}
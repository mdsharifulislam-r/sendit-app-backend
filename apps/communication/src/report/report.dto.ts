import { IsArray, IsMongoId, IsOptional, IsString } from "class-validator";
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
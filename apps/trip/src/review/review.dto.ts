import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { Types } from "mongoose";

export enum ReviewType {
    BOOKING = "booking",
    PLATFORM = "platform"
}

export class CreateReviewDto {
    @ApiProperty({
        description: "Give the rating",
        example: 5,
    })
    @IsNumber()
    @IsNotEmpty()
    rating: number
    @ApiProperty({
        description: "Give the comment",
        example: "Good service",
    })
    @IsString()
    comment: string
    @ApiProperty({
        description: "Give the booking id",
        example: "646847e2b3e1f1a0e1f32c48",
    })
    @IsMongoId()
    @IsOptional()
    booking: Types.ObjectId

    @ApiProperty({
        description: "Give the review type",
        enum: ReviewType,
        example: ReviewType.BOOKING,
    })
    @IsEnum(ReviewType)
    @IsOptional()
    type: ReviewType

    transporter: Types.ObjectId
    user: Types.ObjectId
}


export class ChangeReviewStatusDto {
    @ApiProperty({
        description: "Give the status",
        example: "approved",
        enum: ['pending', 'approved', 'rejected']
    })
    @IsEnum(['pending', 'approved', 'rejected'])
    @IsNotEmpty()
    status: 'pending' | 'approved' | 'rejected'

}



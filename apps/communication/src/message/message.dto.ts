import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsMongoId, IsOptional, IsString, isString } from "class-validator";
import { Types } from "mongoose";

export enum MESSAGE_TYPE {
    TEXT = 'text',
    IMAGE = 'image',
    DOCUMENT = 'document',
}

export class CreateMessageDto {
    sender: Types.ObjectId;
    receiver: Types.ObjectId;

    @ApiProperty({
        type: String,
        description: 'Please provide a valid chat id.',
        example: '123456789012345678901234'
    })
    @IsMongoId({ message: "Please provide a valid chat id." })
    chat: Types.ObjectId;

    @ApiProperty({
        type: String,
        description: 'Please provide a valid message type.',
        example: 'text',
        enum: MESSAGE_TYPE
    })
    @IsEnum(MESSAGE_TYPE)
    type: MESSAGE_TYPE

    @IsOptional()
    @IsString()
    message?: string

    @ApiProperty({
        type: String,
        format: 'binary',
    })
    images?: string[]

    @ApiProperty({
        type: String,
        format: 'binary',
    })
    documents?: string[]

    @ApiProperty({
        description: "The ID of the report.",
        example: '123456789012345678901234',
    })
    @IsMongoId()
    @IsOptional()
    report?: Types.ObjectId
}
import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Types } from "mongoose";

export enum CHAT_STATUS {
    ACTIVE = 'active',
    BLOCK = 'block',
    ARCHIVE = 'archive',
    DELETE = 'delete',
}

export enum CHAT_TYPE {
    SINGLE = 'single',
    GROUP = 'group',
    CHANNEL = 'channel',
}


export class CreateChatDto {
    @IsNotEmpty()
    @IsArray()
    @IsMongoId({ each: true })
    participants: Types.ObjectId[];

    status: CHAT_STATUS

    isMute: boolean

    @IsOptional()
    @IsMongoId()
    trip: Types.ObjectId

    @IsMongoId()
    @IsOptional()
    booking: Types.ObjectId

    @IsMongoId()
    @IsOptional()
    sender: Types.ObjectId

    @IsMongoId()
    @IsOptional()
    transporter: Types.ObjectId

    @IsMongoId()
    @IsOptional()
    receiver: Types.ObjectId


    @IsOptional()
    @IsEnum(CHAT_TYPE)
    type: CHAT_TYPE

}
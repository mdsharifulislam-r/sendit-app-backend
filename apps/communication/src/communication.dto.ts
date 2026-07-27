import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export enum FilePathType {
    USER = "user",
    BOOKING = "booking",
    REVIEW = "review",
    WITHDRAWAL = "withdrawal",
    TRIP = "trip",
    REPORT = "report",
    RISKY_ITEM = "risky_item"
}

export class CreateNotificationDto {
    @IsOptional()
    @IsArray()
    receiver?: string[];

    @IsString()
    title: string;

    @IsString()
    message: string;

    @IsBoolean()
    isRead: boolean;

    @IsOptional()
    @IsEnum(FilePathType)
    filePath?: FilePathType;

    @IsOptional()
    @IsString()
    referenceId?: string;

    @IsOptional()
    @IsArray()
    readers?: string[];
}
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { Types } from "mongoose";
import { TicketPriority } from "./ticket.entity";

export class CreateTicketDto {
    @ApiProperty({
        example: 'Ticket Title',
        required: true,
        description: "Ticket Title",
    })
    @IsNotEmpty({ message: "Ticket title is required" })
    @IsString({ message: "Ticket title must be a string" })
    title: string;

    @ApiProperty({
        example: 'Ticket Description',
        required: true,
        description: "Ticket Description",
    })
    @IsNotEmpty({ message: "Ticket description is required" })
    @IsString({ message: "Ticket description must be a string" })
    description: string;

    @ApiProperty({
        example: 'Booking ID',
        required: true,
        description: "Booking ID",
    })
    @IsNotEmpty({ message: "Booking ID is required" })
    @IsString({ message: "Booking ID must be a string" })
    booking: string;

    @ApiProperty({
        example: 'Report Owner',
        required: true,
        description: "Report Owner",
    })
    @IsNotEmpty({ message: "Report is required" })
    @IsMongoId({ message: "Report must be a valid mongo ID" })
    report: Types.ObjectId;

    @ApiProperty({
        example: 'Priority',
        required: true,
        description: "Priority",
        enum: TicketPriority
    })
    @IsNotEmpty({ message: "Priority is required" })
    @IsEnum(TicketPriority)
    priority: TicketPriority

}



export class ResolveTicketDto {
    @ApiPropertyOptional({
        example: 100,
        description: "Refund Amount",
    })
    @IsOptional()
    @IsNumber({}, { message: "Amount must be a number" })
    @IsPositive({ message: "Amount must be greater than 0" })
    amount: number;

}
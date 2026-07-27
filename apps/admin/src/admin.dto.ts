import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ADMIN_SUB_ROLE } from "utils/enums/user";

export class CancelTripDto {
    @ApiPropertyOptional({
        example: 'Trip cancelled due to bad weather',
        required: false,
        description: 'Reason for trip cancellation',
    })
    @IsOptional()
    @IsString()
    reason?: string
}

export class CreateAdminDto {
    @ApiProperty({
        example: 'John Doe',
        required: true,
        description: 'Admin name',
    })
    @IsNotEmpty({ message: 'Name is required' })
    @IsString({ message: 'Name must be a string' })
    name: string

    @ApiProperty({
        example: 'john.doe@example.com',
        required: true,
        description: 'Admin email',
    })
    @IsNotEmpty({ message: 'Email is required' })
    @IsString({ message: 'Email must be a string' })
    @IsEmail()
    email: string

    @ApiProperty({
        example: '1234567890',
        required: true,
        description: 'Admin contact',
    })
    @IsNotEmpty({ message: 'Contact is required' })
    @IsString({ message: 'Contact must be a string' })
    contact: string

    @ApiProperty({
        example: 'senior_dispatcher',
        required: true,
        description: 'Admin sub role',
        enum: ADMIN_SUB_ROLE,
    })
    @IsNotEmpty()
    @IsEnum(ADMIN_SUB_ROLE)
    admin_sub_role: ADMIN_SUB_ROLE

    @ApiProperty({
        example: ["read", "write"],
        required: true,
        description: 'Admin permissions',
    })
    @IsNotEmpty({ message: 'Permissions are required' })
    @IsArray({ message: 'Permissions must be an array' })
    @IsString({ each: true, message: 'Permissions must be an array of strings' })
    permissions: string[]

    @ApiProperty({
        example: 'password123',
        required: true,
        description: 'Admin password',
    })
    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    password: string
}


export class UpdateAdminDto {
    @ApiPropertyOptional({
        example: 'John Doe',
        required: false,
        description: 'Admin name',
    })
    @IsOptional()
    @IsString({ message: 'Name must be a string' })
    name?: string

    @ApiPropertyOptional({
        example: 'john.doe@example.com',
        required: false,
        description: 'Admin email',
    })
    @IsOptional()
    @IsString({ message: 'Email must be a string' })
    @IsEmail()
    email?: string

    @ApiPropertyOptional({
        example: '1234567890',
        required: false,
        description: 'Admin contact',
    })
    @IsOptional()
    @IsString({ message: 'Contact must be a string' })
    contact?: string

    @ApiPropertyOptional({
        example: 'senior_dispatcher',
        required: false,
        description: 'Admin sub role',
        enum: ADMIN_SUB_ROLE,
    })
    @IsOptional()
    @IsEnum(ADMIN_SUB_ROLE)
    admin_sub_role?: ADMIN_SUB_ROLE

    @ApiPropertyOptional({
        example: ["read", "write"],
        required: false,
        description: 'Admin permissions',
    })
    @IsOptional()
    @IsArray({ message: 'Permissions must be an array' })
    @IsString({ each: true, message: 'Permissions must be an array of strings' })
    permissions?: string[]

    @ApiPropertyOptional({
        example: 'password123',
        required: false,
        description: 'Admin password',
    })
    @IsOptional()
    @IsString({ message: 'Password must be a string' })
    password?: string
}
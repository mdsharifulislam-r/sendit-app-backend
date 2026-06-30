import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  IsBoolean,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { SOCIAL_PLATFORM, USER_ROLES } from 'utils/enums/user';
import { CreateDeviceDto } from '../device/device.dto';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address (must be unique)' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8, description: 'Password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({ enum: USER_ROLES, default: USER_ROLES.TRANSPORTER })
  @IsOptional()
  @IsEnum(USER_ROLES)
  role?: USER_ROLES;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Updated full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Updated phone number' })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg', description: 'Updated profile image URL', type: 'string', format: "binary" })
  @IsOptional()
  @IsString()
  image?: string;
}


export class CompleteKycVerificationDto {
  @ApiProperty({ example: 'passport_image', description: 'passport_image', type: 'string', format: "binary" })
  passport_image!: string;

  @ApiProperty({ example: 'driving_license_image', description: 'driving_license_image', type: 'string', format: "binary" })
  driving_license_image!: string;

  @ApiProperty({ example: 'id_card_front_image', description: 'id_card_front_image', type: 'string', format: "binary" })
  id_card_front_image!: string;

  @ApiProperty({ example: 'id_card_back_image', description: 'id_card_back_image', type: 'string', format: "binary" })
  id_card_back_image!: string;
}


export class ChangeEmailDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  email!: string;
}


export class ChangeEmailVerifyDto {
  @ApiProperty({ example: '123456', description: 'OTP' })
  @IsNumber()
  otp!: number;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  email!: string;
}

export class SocialLoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg', description: 'Profile image URL' })
  @IsOptional()
  @IsUrl()
  image!: string;

  @ApiProperty({ enum: SOCIAL_PLATFORM, description: 'Social platform' })
  @IsEnum(SOCIAL_PLATFORM)
  social_platform!: SOCIAL_PLATFORM;

  @ApiProperty({ example: 'app_id', description: 'App ID' })
  @IsString()
  app_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => CreateDeviceDto)
  device_info!: CreateDeviceDto

}

export class DeleteAccountDto {
  @ApiProperty({ example: 'StrongPass123!', description: 'Password' })
  @IsString()
  password!: string;
}

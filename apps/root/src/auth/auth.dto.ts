import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';
import { CreateDeviceDto } from '../device/device.dto';
import { Type } from 'class-transformer';

export class VerifyEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 1234, description: '4-digit OTP code' })
  @IsNumber()
  @Min(1000)
  @Max(9999)
  oneTimeCode: number;
}

export class ForgetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class LoginDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '01711111111' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsOptional()
  @Type(() => CreateDeviceDto)
  deviceInfo?: CreateDeviceDto

  @ApiProperty({ example: 'token' })
  @IsOptional()
  @IsString()
  fcm_token?: string
}

export class AuthResetPasswordDto {
  @ApiProperty({ example: 'NewStrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({ example: 'NewStrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPass123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewStrongPass123!', minLength: 8, })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({ example: 'NewStrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}

export class FaceRegistrationDto {
  @ApiProperty({ example: '1234567890', description: 'device id' })
  @IsString()
  deviceId: string

  @ApiProperty({ example: 'face' })
  @IsString()
  @IsEnum(["face", "fingerprint"])
  type: "face" | "fingerprint"

  @ApiProperty({ example: '1234567890', description: 'fingerprint id' })
  @IsOptional()
  @IsString()
  fingerprint_id?: string

  @ApiProperty()
  @IsOptional()
  deviceInfo: CreateDeviceDto

  @ApiProperty({ example: 'token' })
  @IsOptional()
  @IsString()
  fcm_token?: string
}

export class WhatsappSendOtpDto {
  @ApiProperty({ example: '+8801234567890' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Phone must be a valid international number, e.g. +8801234567890',
  })
  phone: string;
}

export class WhatsappVerifyOtpDto {
  @ApiProperty({ example: '+8801234567890' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Phone must be a valid international number, e.g. +8801234567890',
  })
  phone: string;

  @ApiProperty({ example: '1234', description: '4-digit OTP sent on WhatsApp' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/, { message: 'OTP must be 4 to 6 digits' })
  otp: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => CreateDeviceDto)
  device_info?: CreateDeviceDto;

  @ApiPropertyOptional({ example: 'fcm-token' })
  @IsOptional()
  @IsString()
  fcm_token?: string;
}

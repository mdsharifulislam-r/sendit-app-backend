import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
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

  @ApiProperty({ example: 'NewStrongPass123!', minLength: 8 })
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
}

import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  AuthResetPasswordDto,
  ChangePasswordDto,
  FaceRegistrationDto,
  ForgetPasswordDto,
  LoginDto,
  VerifyEmailDto,
} from './auth.dto';
import { CurrentUser } from 'utils/decorators/user.decorator';
import { Auth } from 'utils/guards/auth.guard';
import { SocialLoginDto } from '../user/user.dto';
import { FileUpload } from 'utils/decorators/file-uploader.decorator';
import { GetFile } from 'utils/decorators/get-file.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Returns JWT access token.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Post('social-signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Social signin' })
  @ApiResponse({ status: 200, description: 'Social signin successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  socialSignIn(@Body() payload: SocialLoginDto) {
    return this.authService.socialSignIn(payload);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
  verifyOtp(@Body() payload: VerifyEmailDto) {
    return this.authService.verifyOtp(payload);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent to email.' })
  forgotPassword(@Body() payload: ForgetPasswordDto) {
    return this.authService.forgotPassword(payload);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using reset token from verify-otp' })
  @ApiHeader({ name: 'authorization', description: 'Reset token (not a JWT)', required: true })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  resetPassword(
    @Body() payload: AuthResetPasswordDto,
    @Headers('authorization') token: string,
  ) {
    return this.authService.resetPassword(payload, token);
  }

  @Post('change-password')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change password (authenticated users only)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  changePassword(
    @Body() payload: ChangePasswordDto,
    @CurrentUser() user: any,
  ) {
    return this.authService.changePassword(payload, user.id);
  }

  @Post('face-register')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @FileUpload({
    fields: [
      {
        fieldName: "image",
        maxCount: 1
      }
    ]
  })
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Face register (authenticated users only)' })
  @ApiResponse({ status: 200, description: 'Face register successful.' })
  faceRegister(
    @Body() payload: FaceRegistrationDto,
    @CurrentUser() user: any,
    @GetFile('image') image: string[]
  ) {
    return this.authService.registerWithFace(payload, user.id, image?.[0]);
  }

  @Post('verify-face')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @FileUpload({
    fields: [
      {
        fieldName: "image",
        maxCount: 1
      }
    ]
  })
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verify face (authenticated users only)' })
  @ApiResponse({ status: 200, description: 'Face verified successfully.' })
  verifyFace(
    @Body() payload: FaceRegistrationDto,
    @CurrentUser() user: any,
    @GetFile('image') image: string[]
  ) {
    if (typeof payload.deviceInfo == "string") {
      payload.deviceInfo = JSON.parse(payload.deviceInfo)
    }
    return this.authService.faceverificationAndlogin(payload, image?.[0]);
  }
}

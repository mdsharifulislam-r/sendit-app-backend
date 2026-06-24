import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { ChangeEmailDto, ChangeEmailVerifyDto, CompleteKycVerificationDto, CreateUserDto, DeleteAccountDto, UpdateProfileDto } from './user.dto';
import { USER_ROLES } from 'utils/enums/user';
import { CurrentUser } from 'utils/decorators/user.decorator';
import { Auth } from 'utils/guards/auth.guard';
import { FileUpload } from 'utils/decorators/file-uploader.decorator';
import { GetFile } from 'utils/decorators/get-file.decorator';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User created. OTP sent to email.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get('profile')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile fetched successfully.' })
  getProfile(@CurrentUser() user: any) {
    return this.userService.getProfile(user.id);
  }

  @Patch('profile')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update user profile (supports image upload)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @FileUpload({ fields: [{ fieldName: 'image', maxCount: 1 }] })
  updateProfile(
    @CurrentUser() user: any,
    @Body() payload: UpdateProfileDto,
    @GetFile('image') image: string[] | null,
  ) {
    return this.userService.updateProfile(user.id, payload, image?.[0] ?? undefined);
  }

  @Post('kyc/complete')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Complete KYC verification (supports image upload)' })
  @ApiResponse({ status: 200, description: 'KYC verification completed successfully.' })
  @FileUpload({
    fields: [
      { fieldName: 'passport_image', maxCount: 1 },
      { fieldName: 'driving_license_image', maxCount: 1 },
      { fieldName: 'id_card_front_image', maxCount: 1 },
      { fieldName: 'id_card_back_image', maxCount: 1 },
    ]
  })
  completeKycVerification(
    @CurrentUser() user: any,
    @Body() payload: CompleteKycVerificationDto,
    @GetFile() files: Record<string, string>,
  ) {
    return this.userService.completeKycVerification(user.id, files as any as CompleteKycVerificationDto);
  }

  @Post('change-email-address')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change email address' })
  @ApiResponse({ status: 200, description: 'OTP sent to your email.' })
  changeEmailAddress(
    @CurrentUser() user: any,
    @Body() payload: ChangeEmailDto,
  ) {
    return this.userService.changeEmailAddress(user.id, payload);
  }

  @Post('change-email-address-verify')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verify email address change' })
  @ApiResponse({ status: 200, description: 'Email address changed successfully.' })
  changeEmailAddressVerify(
    @CurrentUser() user: any,
    @Body() payload: ChangeEmailVerifyDto,
  ) {
    return this.userService.changeEmailAddressVerify(user.id, payload);
  }

  @SqsConsumer('email')
  handleUserCreated(data: { userId: string }) {
    console.log('User created:', data.userId);
  }

  @Delete('account-delete')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully.' })
  deleteAccount(
    @CurrentUser() user: any,
    @Body() payload: DeleteAccountDto,
  ) {
    return this.userService.accountDelete(payload, user.id);
  }

}

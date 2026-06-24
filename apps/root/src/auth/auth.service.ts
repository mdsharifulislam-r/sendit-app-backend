import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  AuthResetPasswordDto,
  ChangePasswordDto,
  ForgetPasswordDto,
  LoginDto,
  VerifyEmailDto,
} from './auth.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, ResetToken, ResetTokenDocument } from '../user/user.entity';
import { Model } from 'mongoose';
import { ApiError } from 'utils/errors/api-error';
import sendResponse from 'utils/helper/sendResponse';
import cryptoToken from 'utils/helper/cryptoToken';
import { comparePassword, hashPassword } from 'utils/helper/bycrptHelper';
import { JwtService } from '@nestjs/jwt';
import generateOTP from 'utils/helper/generateOtp';
import { emailTemplate } from 'utils/shared/emailTemplate';
import { EmailService } from '../../../../utils/helper-modules/email/email.service';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateAuditLogsDto } from 'apps/admin/src/audit-logs/audit-logs.dto';
import { SocialLoginDto } from '../user/user.dto';
import { USER_ROLES } from 'utils/enums/user';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ResetToken.name) private readonly resetTokenModel: Model<ResetTokenDocument>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly snsService: SnsService
  ) { }

  private async findActiveUserByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ $or: [{ email }, { contact: email }] })
      .select('id name email password verified status role authentication');

    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found');
    }
    if (user.status === 'delete') {
      throw new ApiError(HttpStatus.FORBIDDEN, 'This account has been deactivated');
    }
    return user;
  }

  async verifyOtp(payload: VerifyEmailDto) {
    const { email, oneTimeCode } = payload;
    const user = await this.findActiveUserByEmail(email);

    if (user.authentication?.oneTimeCode !== oneTimeCode) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'Invalid OTP code');
    }

    if (new Date(user.authentication?.expireAt!) < new Date()) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'OTP code has expired');
    }

    const isResetPassword = user.authentication?.isResetPassword;

    await this.userModel.findByIdAndUpdate(user._id, {
      authentication: {
        isResetPassword: false,
        oneTimeCode: null,
        expireAt: null,
      },
      ...(!isResetPassword && { verified: true }),
    });

    if (!isResetPassword) {
      await this.snsService.publish('wallet.created', user._id.toString());
      await this.snsService.publish<CreateAuditLogsDto>('audit.create', {
        action: `New User Registered`,
        user: user._id,
        old_value: '',
        new_value: '',
        reason: ''
      })
      return sendResponse({
        statusCode: HttpStatus.OK,
        message: 'Email verified successfully',
        data: { email: user.email },
        success: true,
      });
    }

    const token = cryptoToken();
    await new this.resetTokenModel({ token, userId: user._id.toString() }).save();

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'OTP verified. Use the token to reset your password.',
      data: { token },
      success: true,
    });
  }

  async login(payload: LoginDto) {

    if (!payload.email && !payload.phone) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'Email or phone is required');
    }
    const user = await this.findActiveUserByEmail(payload.email! || payload.phone!);


    if (!user.verified) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'Please verify your email before logging in');
    }

    const isMatch = await comparePassword(payload.password, user.password);
    if (!isMatch) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid email or password');
    }

    const accessToken = this.jwtService.sign({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: { accessToken, role: user.role },
      success: true,
    });
  }

  async forgotPassword(payload: ForgetPasswordDto) {
    const user = await this.findActiveUserByEmail(payload.email);

    const otp = generateOTP();
    const template = emailTemplate.resetPassword({ email: user.email, otp });

    this.emailService.sendEmail(template).catch((err) =>
      this.logger.error(`Failed to send reset password email to ${user.email}`, err),
    );

    await this.userModel.findByIdAndUpdate(user._id, {
      authentication: {
        isResetPassword: true,
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60 * 1000),
      },
    });

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Password reset OTP sent to your email',
      data: { email: user.email },
      success: true,
    });
  }

  async resetPassword(payload: AuthResetPasswordDto, token: string) {
    if (payload.newPassword !== payload.confirmPassword) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'Passwords do not match');
    }

    const resetToken = await this.resetTokenModel.findOne({ token });
    if (!resetToken) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Invalid or expired reset token');
    }

    const user = await this.userModel
      .findById(resetToken.userId)
      .select('id email password status');

    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found');
    }
    if (user.status === 'delete') {
      throw new ApiError(HttpStatus.FORBIDDEN, 'This account has been deactivated');
    }

    const isSamePassword = await comparePassword(payload.newPassword, user.password);
    if (isSamePassword) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'New password cannot be the same as the current password');
    }

    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashPassword(payload.newPassword),
      authentication: { isResetPassword: false, oneTimeCode: null, expireAt: null },
    });

    await this.resetTokenModel.deleteOne({ _id: resetToken._id });

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Password reset successfully. You can now log in.',
      data: { email: user.email },
      success: true,
    });
  }

  async changePassword(payload: ChangePasswordDto, userId: string) {
    if (payload.newPassword !== payload.confirmPassword) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'New password and confirm password do not match');
    }

    const user = await this.userModel
      .findById(userId)
      .select('id email password status');

    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found');
    }
    if (user.status === 'delete') {
      throw new ApiError(HttpStatus.FORBIDDEN, 'This account has been deactivated');
    }

    const isMatch = await comparePassword(payload.currentPassword, user.password);
    if (!isMatch) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'Current password is incorrect');
    }

    if (payload.currentPassword === payload.newPassword) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'New password must differ from the current password');
    }

    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashPassword(payload.newPassword),
    });

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Password changed successfully',
      data: { email: user.email },
      success: true,
    });
  }

  async socialSignIn(dto: SocialLoginDto) {
    const existUser = await this.userModel.findOne({ email: dto.email, is_social_login: true, social_platform: dto.social_platform })

    if (!existUser) {
      const user = await this.userModel.create({
        ...dto,
        is_social_login: true,
        social_platform: dto.social_platform,
        app_id: dto.app_id,
        role: USER_ROLES.TRAVELER,
        password: `welcome123`
      });

      const accessToken = this.jwtService.sign({
        id: user._id.toString(),
        role: user.role,
        email: user.email,
      });

      return sendResponse({
        statusCode: HttpStatus.OK,
        message: 'Login successful',
        data: { accessToken, role: user.role },
        success: true,
      });
    }

    const accessToken = this.jwtService.sign({
      id: existUser._id.toString(),
      role: existUser.role,
      email: existUser.email,
    });

    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: { accessToken, role: existUser.role },
      success: true,
    });

  }
}

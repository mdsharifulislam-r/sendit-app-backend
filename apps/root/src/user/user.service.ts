import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './user.entity';
import { Model } from 'mongoose';
import { EmailService } from '../../../../utils/helper-modules/email/email.service';
import { ChangeEmailDto, ChangeEmailVerifyDto, CompleteKycVerificationDto, CreateUserDto, DeleteAccountDto, SocialLoginDto, UpdateProfileDto } from './user.dto';
import { ApiError } from 'utils/errors/api-error';
import generateOTP from 'utils/helper/generateOtp';
import sendResponse from 'utils/helper/sendResponse';
import { cleanObject } from 'utils/helper/cleanObject';
import MongooseQueryBuilder from 'utils/queryBuilder/queryBuilder';
import { emailTemplate } from 'utils/shared/emailTemplate';
import { S3Service } from 'utils/helper-modules/upload/s3.service';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateNotificationDto, FilePathType } from 'apps/communication/src/communication.dto';
import { ConfigService } from '@nestjs/config';
import { USER_ROLES } from 'utils/enums/user';
import { CreateAuditLogsDto } from 'apps/admin/src/audit-logs/audit-logs.dto';
import { RiskSettings, RiskSettingsDocument } from 'apps/admin/src/risk-settings/risk-settings.entity';
import { CreateRiskyItems, RISK_ITEM_TYPE, RISKY_ITEM_STATUS } from 'apps/admin/src/risk-settings/risk-settings.dto';
import * as bcrypt from 'bcrypt';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { ReferralService } from '../referral/referral.service';
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RiskSettings.name) private readonly riskSettingsModel: Model<RiskSettingsDocument>,
    private readonly emailService: EmailService,
    private readonly s3Service: S3Service,
    private readonly snsService: SnsService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly refferalService: ReferralService
  ) { }

  async create(dto: CreateUserDto) {
    const exists = await this.userModel.findOne({ email: dto.email });
    const phoneExist = await this.userModel.findOne({ contact: dto.contact });
    if (exists || phoneExist) {
      if (!exists?.verified || !phoneExist?.verified) {
        this.handleUnverifiedUser(dto.email);
        return sendResponse({
          statusCode: HttpStatus.OK,
          success: true,
          message: 'User with this email already exists. Please verify your email.',
        });
      }
      throw new ApiError(HttpStatus.CONFLICT, `User with this ${exists ? 'email' : 'phone number'} already exists`);
    }


    const user = new this.userModel(dto);
    const savedUser = await user.save();
    if (dto.from_referral) {
      const isExistRefUser = await this.userModel.findOne({ referral_code: dto.from_referral })
      if (isExistRefUser) {
        const isExist = await this.refferalService.checkReferral(savedUser._id.toString(), isExistRefUser._id.toString(), savedUser._id.toString())
        if (!isExist) {
          await this.userModel.findByIdAndUpdate(savedUser._id, {
            from_referral: dto.from_referral,
          }, { new: true })
        }
        delete dto.from_referral
      }
    }
    const otp = generateOTP();
    const template = emailTemplate.createAccount({
      name: savedUser.name,
      email: savedUser.email,
      otp,
    });

    await this.snsService.publish('email.send', template);

    await this.userModel.findByIdAndUpdate(savedUser._id, {
      authentication: {
        isResetPassword: false,
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60 * 1000),
      },
    });

    const result = savedUser.toObject() as any;
    delete result.password;
    delete result.authentication;
    return sendResponse({
      statusCode: HttpStatus.CREATED,
      data: result,
      success: true,
      message: 'Account created. Please verify your email with the OTP sent.',
    });
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found');
    }

    return sendResponse({
      statusCode: HttpStatus.OK,
      data: user,
      success: true,
      message: 'Profile fetched successfully',
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, imagePath?: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found');
    }

    if (imagePath) {
      const imageUrl = await this.s3Service.uploadFile(imagePath);
      dto.image = imageUrl.url;
    }

    const updatePayload = cleanObject({
      ...dto,
      ...(imagePath && { image: dto.image }),
    });

    if (!Object.keys(updatePayload).length) {
      return sendResponse({
        statusCode: HttpStatus.OK,
        data: user,
        success: true,
        message: 'Nothing to update',
      });
    }

    const updated = await this.userModel.findByIdAndUpdate(userId, updatePayload, { new: true });

    return sendResponse({
      statusCode: HttpStatus.OK,
      data: updated,
      success: true,
      message: 'Profile updated successfully',
    });
  }

  async getAllUsers(query: Record<string, any>) {
    // const qb = new MongooseQueryBuilder(this.userModel, query)
    //   .search(['name', 'email'])
    //   .sort()
    //   .paginate()
    //   .project({ password: 0, authentication: 0 });

    // const [data, pagination] = await Promise.all([
    //   qb.getMany(),
    //   qb.getPaginationInfo(),
    // ]);

    return sendResponse({
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Users fetched successfully',
    });
  }

  async handleUnverifiedUser(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found');
    }
    if (user.verified) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'User is already verified');
    }
    const otp = generateOTP();
    const template = emailTemplate.createAccount({
      name: user.name,
      email: user.email,
      otp,
    });
    await this.snsService.publish("email.send", template);
    await this.userModel.findByIdAndUpdate(user._id, {
      authentication: {
        isResetPassword: false,
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60 * 1000),
      },
    });
    return sendResponse({
      statusCode: HttpStatus.OK,
      data: null,
      success: true,
      message: 'OTP sent to your email',
    });
  }

  async completeKycVerification(userId: string, dto: CompleteKycVerificationDto) {
    const user = await this.userModel.findById(userId)
      .select('id passport_info driving_license_info id_card_info name email')
      .lean();

    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found');
    }

    if (!dto) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'No files were uploaded');
    }

    const updateFields: any = {};

    if (dto.passport_image) {
      const imageUrl = await this.s3Service.uploadFile(dto.passport_image);
      updateFields['passport_info.file'] = imageUrl.url;
      updateFields['passport_info.status'] = 'pending';
      updateFields['passport_info.rejection_reason'] = '';
      updateFields['passport_info.verified_at'] = null;
    }

    if (dto.driving_license_image) {
      const imageUrl = await this.s3Service.uploadFile(dto.driving_license_image);
      updateFields['driving_license_info.file'] = imageUrl.url;
      updateFields['driving_license_info.status'] = 'pending';
      updateFields['driving_license_info.rejection_reason'] = '';
      updateFields['driving_license_info.verified_at'] = null;
    }

    if (dto.id_card_front_image) {
      const imageUrl = await this.s3Service.uploadFile(dto.id_card_front_image);
      updateFields['id_card_info.front'] = imageUrl.url;
      updateFields['id_card_info.status'] = 'pending';
      updateFields['id_card_info.rejection_reason'] = '';
      updateFields['id_card_info.verified_at'] = null;
    }

    if (dto.id_card_back_image) {
      const imageUrl = await this.s3Service.uploadFile(dto.id_card_back_image);
      updateFields['id_card_info.back'] = imageUrl.url;
      updateFields['id_card_info.status'] = 'pending';
      updateFields['id_card_info.rejection_reason'] = '';
      updateFields['id_card_info.verified_at'] = null;
    }

    const hasPassport = !!(dto.passport_image || user?.passport_info?.file);
    const hasLicense = !!(dto.driving_license_image || user?.driving_license_info?.file);
    const hasIdFront = !!(dto.id_card_front_image || user?.id_card_info?.front);
    const hasIdBack = !!(dto.id_card_back_image || user?.id_card_info?.back);

    if (hasPassport && hasLicense && hasIdFront && hasIdBack) {
      updateFields['$inc'] = { kyc_submission_count: 1 };
    }

    const updated = await this.userModel.findByIdAndUpdate(userId, updateFields, { new: true }).lean();

    const riskSettings = await this.riskSettingsModel.findOne({}, { max_failed_kyc_attempts: 1 }).lean();

    if ((updated?.kyc_submission_count || 0) >= (riskSettings?.max_failed_kyc_attempts || 0)) {
      this.snsService.publish<CreateRiskyItems>("risk.item.create", {
        type: RISK_ITEM_TYPE.USER,
        description: `User ${user?.name} has submitted KYC more than ${riskSettings?.max_failed_kyc_attempts} times`,
        item: userId as any,
        status: RISKY_ITEM_STATUS.PENDNIG,
      });
    }

    this.snsService.publish<CreateNotificationDto>('notification.send', {
      title: `${user?.name} is requesting for KYC verification`,
      message: 'Please review the KYC documents and approve or reject the request.',
      isRead: false,
      filePath: FilePathType.USER,
      referenceId: userId,
    });

    this.snsService.publish<CreateNotificationDto>('notification.send', {
      title: `KYC Verification Request`,
      message: 'Your KYC verification request has been submitted successfully.',
      isRead: false,
      receiver: [userId],
      filePath: FilePathType.USER,
      referenceId: userId,
    });

    this.snsService.publish<CreateAuditLogsDto>('audit.create', {
      action: 'KYC verification request',
      user: userId as any,
      old_value: '',
      new_value: 'Pending',
      reason: 'KYC verification request',
    });

    return sendResponse({
      statusCode: HttpStatus.OK,
      data: null,
      success: true,
      message: 'KYC verification completed successfully',
    });
  }

  async changeEmailAddress(userId: string, dto: ChangeEmailDto) {
    const existAnotherUser = await this.userModel.findOne({ email: dto.email, status: "active", _id: { $ne: userId } }).select('id email authentication');
    if (existAnotherUser) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "User with this email already exists");
    }
    const user = await this.userModel.findById(userId).select('id email authentication name');
    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
    }

    const otp = generateOTP();
    const template = emailTemplate.changeEmailAddress({
      name: user.name,
      email: user.email,
      otp,
    });
    this.emailService.sendEmail(template);
    await this.userModel.findByIdAndUpdate(userId, {
      authentication: {
        isResetPassword: false,
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60 * 1000),
      }
    });
    return sendResponse({
      statusCode: HttpStatus.OK,
      data: null,
      success: true,
      message: "OTP sent to your email",
    });
  }

  async changeEmailAddressVerify(userId: string, dto: ChangeEmailVerifyDto) {
    const user = await this.userModel.findById(userId).select('id email authentication');
    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
    }
    if (user.authentication.oneTimeCode !== dto.otp) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Invalid OTP");
    }
    if (new Date(user.authentication?.expireAt!) < new Date()) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "OTP expired");
    }
    await this.userModel.findByIdAndUpdate(userId, {
      email: dto.email,
      authentication: {
        isResetPassword: false,
        oneTimeCode: null,
        expireAt: null,
      }
    });
    return sendResponse({
      statusCode: HttpStatus.OK,
      data: null,
      success: true,
      message: "Email changed successfully",
    });
  }

  async seedAdmin() {
    const existAdmin = await this.userModel.findOne({ email: this.configService.get('SUPER_ADMIN_EMAIL'), role: USER_ROLES.SUPER_ADMIN })
    if (existAdmin) {
      return true
    }

    const admin = this.userModel.create({
      email: this.configService.get('SUPER_ADMIN_EMAIL'),
      name: 'Adminstrator',
      status: 'active',
      role: USER_ROLES.SUPER_ADMIN,
      verified: true,
      password: this.configService.get('SUPER_ADMIN_PASSWORD')
    })

    console.log('Admin created successfully');
    return true
  }

  async accountDelete(payload: DeleteAccountDto, userId: string) {
    const user = await this.userModel.findById(userId).select("+password")

    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
    }

    if (user.status == 'delete') {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Account already deleted");
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.password);

    if (!isPasswordValid) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Invalid password");
    }

    await this.userModel.findByIdAndUpdate(userId, {
      status: 'delete'
    })

    return sendResponse({
      statusCode: HttpStatus.OK,
      data: null,
      success: true,
      message: "Account deleted successfully",
    });

  }

  async sendOtpInPhoneNumber(userId: string) {
    const user = await this.userModel.findById(userId).select('id email authentication name contact')
    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
    }

    console.log('user :>> ', user.contact);



    const otp = generateOTP();
    await this.cacheService.set(`otp:${userId}`, otp, 60 * 3)
    const result = await this.snsService.sendOtpInPhoneNumber(user.contact, `${otp}`);
    console.log(result);


    return sendResponse({
      statusCode: HttpStatus.OK,
      data: null,
      success: true,
      message: "OTP sent to your phone number",
    });
  }

  async verifyOtpInPhoneNumber(userId: string, otp: number) {
    const user = await this.userModel.findById(userId).select('id email authentication name contact')
    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
    }
    const cachedOtp = await this.cacheService.get(`otp:${userId}`);
    if (!cachedOtp) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Otp is expired. Please resend");
    }
    if (cachedOtp != otp) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Invalid Otp");
    }
    await this.userModel.findByIdAndUpdate(userId, {
      phone_number_verification_date: new Date(),
      is_phone_number_verified: true
    });
    await this.cacheService.deleteByPattern(`otp:${userId}`);
    return sendResponse({
      statusCode: HttpStatus.OK,
      data: null,
      success: true,
      message: "OTP verified successfully",
    });
  }


  async getUserInfo(searchText: string) {
    searchText = searchText.startsWith(" ") ? "+" + searchText : searchText;

    const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await this.userModel.findOne({
      $or: [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
        { contact: { $regex: escapedSearch, $options: 'i' } }
      ]
    }, { name: 1, email: 1, contact: 1, image: 1 })

    return sendResponse({
      statusCode: 200,
      success: true,
      message: "User info fetch successfully",
      data: user
    })
  }




}

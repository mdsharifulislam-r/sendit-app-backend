import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './user.entity';
import { Model } from 'mongoose';
import { EmailService } from '../../../../utils/helper-modules/email/email.service';
import { ChangeEmailDto, ChangeEmailVerifyDto, CompleteKycVerificationDto, CreateUserDto, UpdateProfileDto } from './user.dto';
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

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
    private readonly s3Service: S3Service,
    private readonly snsService: SnsService,
    private readonly configService: ConfigService
  ) { }

  async create(dto: CreateUserDto) {
    const exists = await this.userModel.findOne({ email: dto.email });
    if (exists) {
      if (!exists.verified) {
        this.handleUnverifiedUser(dto.email);
        return sendResponse({
          statusCode: HttpStatus.OK,
          success: true,
          message: 'User with this email already exists. Please verify your email.',
        });
      }
      throw new ApiError(HttpStatus.CONFLICT, 'User with this email already exists');
    }

    const user = new this.userModel(dto);
    const savedUser = await user.save();
    const otp = generateOTP();
    const template = emailTemplate.createAccount({
      name: savedUser.name,
      email: savedUser.email,
      otp,
    });

    this.snsService.publish("email.send", template);

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
    const user = await this.userModel.findById(userId).select('id passport_info driving_license_info id_card_info name email');

    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'User not found ');
    }

    await this.userModel.findByIdAndUpdate(userId, {
      passport_info: {
        ...user.passport_info,
        file: (await this.s3Service.uploadFile(dto.passport_image)).url,
        status: "pending",
        rejection_reason: "",
        verified_at: null,
      },
      driving_license_info: {
        ...user.driving_license_info,
        file: (await this.s3Service.uploadFile(dto.driving_license_image)).url,
        status: "pending",
        rejection_reason: "",
        verified_at: null,
      },
      id_card_info: {
        ...user.id_card_info,
        front: (await this.s3Service.uploadFile(dto.id_card_front_image)).url,
        back: (await this.s3Service.uploadFile(dto.id_card_back_image)).url,
        status: "pending",
        rejection_reason: "",
        verified_at: null,
      },
    });

    await this.snsService.publish<CreateNotificationDto>('notification.send', {
      title: `${user?.name} is requesting for KYC verification`,
      message: 'Please review the KYC documents and approve or reject the request.',
      isRead: false,
      filePath: FilePathType.USER,
      referenceId: userId,
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

}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { ADMIN_SUB_ROLE, SOCIAL_PLATFORM, USER_ROLES } from 'utils/enums/user';
import { hashPassword } from 'utils/helper/bycrptHelper';

export type UserDocument = User & Document;
export type ResetTokenDocument = ResetToken & Document;

class Authentication {
  isResetPassword: boolean;
  oneTimeCode: number | null;
  expireAt: Date | null;
}

class PassportInfo {
  file: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  verified_at?: Date | null;
}

class DrivingLicenseInfo {
  file: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  verified_at?: Date | null;
}

class IdCardInfo {
  front: string;
  back: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  verified_at?: Date | null;
}

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'users' })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: USER_ROLES, default: USER_ROLES.TRAVELER })
  role: USER_ROLES;

  @Prop({ type: String, default: null })
  admin_sub_role: ADMIN_SUB_ROLE;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: String, default: null })
  contact: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: String, default: null })
  image: string;

  @Prop({ type: String, enum: ['active', 'delete'], default: 'active' })
  status: 'active' | 'delete';

  @Prop({
    type: {
      file: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejection_reason: { type: String, default: '' },
      verified_at: { type: Date, default: null },
    },
    default: () => ({ file: '', status: 'pending', rejection_reason: '', verified_at: null }),
  })
  passport_info: PassportInfo;

  @Prop({
    type: {
      file: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejection_reason: { type: String, default: '' },
      verified_at: { type: Date, default: null },
    },
    default: () => ({ file: '', status: 'pending', rejection_reason: '', verified_at: null }),
  })
  driving_license_info: DrivingLicenseInfo;

  @Prop({
    type: {
      front: String,
      back: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejection_reason: { type: String, default: '' },
      verified_at: { type: Date, default: null },
    },
    default: () => ({ front: '', back: '', status: 'pending', rejection_reason: '', verified_at: null }),
  })
  id_card_info: IdCardInfo;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ default: false })
  is_social_login: boolean;

  @Prop({ type: String, default: null })
  app_id: string;


  @Prop({ type: String, enum: SOCIAL_PLATFORM })
  social_platform: SOCIAL_PLATFORM

  @Prop({
    type: new MongooseSchema(
      {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
      { _id: false },
    ),
    default: null,
    select: false,
  })
  location: { type: string; coordinates: number[] };

  @Prop({
    type: {
      isResetPassword: { type: Boolean, default: false },
      oneTimeCode: { type: Number, default: null },
      expireAt: { type: Date, default: null },
    },
    select: false,
    default: () => ({ isResetPassword: false, oneTimeCode: null, expireAt: null }),
  })
  authentication: Authentication;

  @Prop({ default: false })
  isKycVerified: boolean;

  @Prop({ type: String, default: null })
  stripe_login_link: string;

  @Prop({ type: String, default: null })
  stripe_account_id: string;

  @Prop({ type: Number, default: 0 })
  avg_rating: number;

  @Prop({ type: Number, default: 0 })
  review_count: number;

  @Prop({ type: Number, default: 0 })
  trip_count: number;

  @Prop({ type: Number, default: 0 })
  kyc_submission_count: number


}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function (next: any) {
  if (this.isModified('password') && this.password && !this.password.startsWith('$2b$')) {
    this.password = hashPassword(this.password);
  }
  next();
});

@Schema({ timestamps: { createdAt: 'createdAt' }, collection: 'reset_tokens' })
export class ResetToken {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  userId: string;
}

export const ResetTokenSchema = SchemaFactory.createForClass(ResetToken);

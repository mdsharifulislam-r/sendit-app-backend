import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import * as crypto from 'crypto';

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'wallets' })
export class Wallet {
  _id: Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
    default: () => `sntd-wal-${crypto.randomUUID()}`,
  })
  id: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  balance: number;

  @Prop({ type: Number, default: 0 })
  pending_balance: number;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

WalletSchema.pre('save', function (next: any) {
  if (!this.id) {
    this.id = `sntd-wal-${crypto.randomUUID()}`;
  }
  next();
});

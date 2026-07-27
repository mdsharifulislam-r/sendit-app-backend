import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export enum TRANSACTION_STATUS {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
}

export enum TRANSACTION_TYPE {
  DEPOSIT = 'Deposit',
  WITHDRAW = 'Withdraw',
  TRANSFER = 'Transfer',
  PAYMENT = 'Payment',
  REFUND = 'Refund'
}

export enum TRANSACTION_PAYMENT_TYPE {
  DEBIT = 'Debit',
  CREDIT = 'Credit',
}

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'transactions' })
export class Transaction {
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  owner: Types.ObjectId;

  @Prop({ unique: true, sparse: true, default: null })
  trx_id: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: Number, default: 0 })
  discount: number;

  @Prop({ type: Number, default: 0 })
  tax: number;

  @Prop({ type: Number, default: 0 })
  platform_charge: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', default: null })
  booking: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  transporter: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  traveler: Types.ObjectId;

  @Prop({ type: String, enum: TRANSACTION_STATUS, default: TRANSACTION_STATUS.PENDING })
  status: TRANSACTION_STATUS;

  @Prop({ type: String, enum: TRANSACTION_PAYMENT_TYPE, required: true })
  payment_status: TRANSACTION_PAYMENT_TYPE;

  @Prop({ type: String, default: null })
  prev_trx_id?: string;

  @Prop({ type: String, enum: TRANSACTION_TYPE, required: true })
  type: TRANSACTION_TYPE;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.pre('save', function (next: any) {
  if (!this.trx_id) {
    this.trx_id = 'TRX-' + Math.floor(Math.random() * 100000000);
  }
  next();
});

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { InjectConnection } from "@nestjs/mongoose";
import { Model, Connection, Types } from "mongoose";
import { Wallet, WalletDocument } from "./wallet.entity";
import { SqsConsumer } from "utils/decorators/sqs-consumer";
import { SnsService } from "utils/helper-modules/sns/sns.service";
import { CreateTransactionDto } from "../transaction/transaction.dto";
import { TRANSACTION_PAYMENT_TYPE, TRANSACTION_STATUS, TRANSACTION_TYPE } from "../transaction/transaction.entity";
import { CacheService } from "utils/helper-modules/cache/cache.service";
import { CreateAuditLogsDto } from "apps/admin/src/audit-logs/audit-logs.dto";


@Injectable()
export class WalletHandler {
    constructor(
        @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
        @InjectConnection() private readonly connection: Connection,
        private readonly snsService: SnsService,
        private readonly cacheService: CacheService
    ) { }


    async handleUserWalletDiposit(data: { wallet_id: string, amount: number }) {
        console.log(data, '===================================');

        const { wallet_id, amount } = data;
        const mongoSession = await this.connection.startSession();
        await mongoSession.startTransaction();
        try {
            const wallet = await this.walletModel
                .findOne({ id: wallet_id })
                .select('user balance id')
                .session(mongoSession);

            if (!wallet) {
                throw new Error("Wallet not found");
            }

            wallet.balance = Number(wallet.balance) + Number(amount * 100);
            await wallet.save({ session: mongoSession });

            await mongoSession.commitTransaction();
            mongoSession.endSession();

            const userId = wallet.user.toString();

            await this.snsService.publish<CreateTransactionDto>('transaction.created', {
                title: "Wallet Diposit",
                amount: amount,
                ownerId: userId,
                trx_id: ``,
                payment_status: TRANSACTION_PAYMENT_TYPE.DEBIT,
                type: TRANSACTION_TYPE.DEPOSIT,
                status: TRANSACTION_STATUS.COMPLETED
            });

            this.snsService.publish<CreateAuditLogsDto>('audit.create', {
                action: 'Wallet Diposit',
                user: userId as any,
                old_value: `${(wallet.balance - amount * 100) / 100}`,
                new_value: `${wallet.balance / 100}`,
                reason: `Amount ${amount} is credited to wallet`
            });

            await this.cacheService.deleteByPattern(`wallet:${userId}`);

            return { message: "Wallet balance updated successfully" };
        } catch (error) {
            await mongoSession.abortTransaction();
            mongoSession.endSession();
            console.log(error);
        }
    }


    async handleUserWalletDipositByUserId(data: { user: string, amount: number, booking_id: string, sender: string, _id: string }) {
        console.log(data, '===================================');

        const { user, amount, sender } = data;
        const mongoSession = await this.connection.startSession();
        await mongoSession.startTransaction();
        try {
            let wallet = await this.walletModel
                .findOne({ user: new Types.ObjectId(user) })
                .select('user balance id')
                .session(mongoSession);

            if (!wallet) {
                const createdWallet = await this.walletModel.create([{ user: user, balance: 0 }], { session: mongoSession });
                wallet = createdWallet[0];
            }

            wallet.balance = Number(wallet.balance) + Number(amount * 100);
            await wallet.save({ session: mongoSession });

            await mongoSession.commitTransaction();
            mongoSession.endSession();

            const userId = wallet.user.toString();

            await this.snsService.publish<CreateTransactionDto>('transaction.created', {
                title: `Booking Payment of ${data.booking_id}`,
                amount: amount,
                ownerId: userId,
                trx_id: ``,
                payment_status: TRANSACTION_PAYMENT_TYPE.CREDIT,
                type: TRANSACTION_TYPE.PAYMENT,
                status: TRANSACTION_STATUS.COMPLETED,
                travelerId: sender,
                bookingId: data._id,
                transporterId: data.user

            });

            await this.cacheService.deleteByPattern(`wallet:${userId}`);

            return { message: "Wallet balance updated successfully" };
        } catch (error) {
            await mongoSession.abortTransaction();
            mongoSession.endSession();
            console.log(error);
        }
    }



}

import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Wallet, WalletDocument } from './wallet.entity';
import { Connection, Model } from 'mongoose';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import { ApiError } from 'utils/errors/api-error';
import { StripeService } from 'utils/helper-modules/stripe/stripe.service';
import sendResponse from 'utils/helper/sendResponse';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { WalletHandler } from './wallet.handler';
import { User, UserDocument } from 'apps/root/src/user/user.entity';
import { Stripe } from 'stripe/cjs/stripe.core';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateTransactionDto } from '../transaction/transaction.dto';
import { TRANSACTION_PAYMENT_TYPE, TRANSACTION_STATUS, TRANSACTION_TYPE } from '../transaction/transaction.entity';
import { CreateNotificationDto, FilePathType } from 'apps/communication/src/communication.dto';
import { CreateAuditLogsDto } from 'apps/admin/src/audit-logs/audit-logs.dto';
import { PricingRules } from '../pricing-rules/pricing-rules.entity';



@Injectable()
export class WalletService {
    constructor(
        @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @InjectModel(PricingRules.name) private readonly pricingRulesModel: Model<PricingRules>,
        private readonly stripeService: StripeService,
        private readonly cacheService: CacheService,
        private readonly handler: WalletHandler,
        @InjectConnection() private readonly connection: Connection,
        private readonly snsService: SnsService,


    ) { }

    @SqsConsumer('wallet.created')
    async createWallet(userId: string) {
        console.log('🚀 ~ WalletService ~ createWallet ~ userId:', userId);
        const existWallet = await this.walletModel.findOne({ user: userId });
        if (existWallet) {
            return existWallet;
        }
        const wallet = new this.walletModel({ user: userId, balance: 0, pending_balance: 0 });
        return await wallet.save();
    }

    async depositIntoWallet(userId: string, amount: number) {
        let wallet = await this.walletModel.findOne({ user: userId }).populate('user');
        if (!wallet) {
            wallet = await this.createWallet(userId);
        }

        const session = await this.stripeService.getClient().checkout.sessions.create({
            payment_method_types: ['card'],
            currency: "tnd",
            line_items: [
                {
                    price_data: {
                        currency: 'tnd',
                        product_data: {
                            name: 'Wallet Topup',
                        },
                        unit_amount: Math.round(amount * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            metadata: { wallet_id: wallet.id, user_id: userId, amount: amount },
            success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `http://localhost:3000/cancel`,
        });

        return sendResponse({
            statusCode: HttpStatus.OK,
            message: 'Deposit into wallet',
            data: { url: session.url },
            success: true,
        });
    }

    async getWalletBalance(userId: string) {
        const cache = await this.cacheService.get(`wallet:${userId}`);
        if (cache) {
            return cache;
        }
        const wallet = await this.walletModel.findOne({ user: userId }).populate('user');
        if (!wallet) {
            const wallet = await this.createWallet(userId);
            return {
                balance: wallet.balance / 100,
                pending_balance: wallet.pending_balance / 100,
                id: wallet?.id,
                user: {
                    id: (wallet.user as any)._id?.toString() || (wallet.user as any).id
                }
            };
        }

        const res = {
            balance: wallet.balance / 100,
            pending_balance: wallet.pending_balance / 100,
            id: wallet?.id,
            user: {
                id: (wallet.user as any)._id?.toString() || (wallet.user as any).id
            }
        };
        await this.cacheService.set(`wallet:${userId}`, res, 60 * 60 * 24);
        return res;
    }
    @SqsConsumer('wallet.diposit')
    async dipositWallet(data: any) {
        console.log(data)
        await this.handler.handleUserWalletDiposit(data)
    }

    @SqsConsumer('wallet.add.payment')
    async addPaymentIntoWallet(data: any) {
        console.log(data)
        await this.handler.handleUserWalletDipositByUserId(data)
    }


    async connectStripeConnectedAccount(userId: string) {
        const userInfo = await this.userModel.findOne({ _id: userId }, { stripe_login_link: 1, contact: 1, name: 1, email: 1 }).lean();
        if (userInfo?.stripe_login_link) {
            return sendResponse({
                statusCode: HttpStatus.OK,
                message: 'Stripe connected account link',
                data: { url: userInfo.stripe_login_link },
                success: true,
            });
        }

        const account = await this.stripeService.getClient().accounts.create({
            type: 'express',
            country: 'US',
            email: userInfo?.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: 'individual',
            individual: {
                first_name: userInfo?.name?.split(' ')?.[0],
                last_name: userInfo?.name?.split(' ')?.[1],
                email: userInfo?.email,
            },
            business_profile: {
                mcc: '7299',
                product_description: 'Freelance services on demand',
                url: 'https://sendit.com',
            },

        });
        const accountLink = await this.stripeService.getClient().accountLinks.create({
            account: account.id,
            refresh_url: 'http://localhost:3000/reauth',
            return_url: 'http://localhost:3000/return',
            type: 'account_onboarding',
        });
        await this.userModel.findByIdAndUpdate(userId, { stripe_account_id: account.id });
        return sendResponse({
            statusCode: HttpStatus.OK,
            message: 'Stripe connected account link',
            data: { url: accountLink.url },
            success: true,
        });

    }

    async verifyConnectedAccount(payload: Stripe.Account) {
        const mongoSession = await this.connection.startSession();
        mongoSession.startTransaction();
        try {

            const user = await this.userModel.findOne({ stripe_account_id: payload.id }).session(mongoSession);
            if (!user) {
                throw new ApiError(HttpStatus.NOT_FOUND, 'User not found');
            }

            if (payload.charges_enabled) {
                const loginLink = await this.stripeService.getClient().account.createLoginLink(payload.id)
                await this.userModel.updateOne({ _id: user._id }, { stripe_login_link: loginLink.url }).session(mongoSession);
            }


            await mongoSession.commitTransaction();
            mongoSession.endSession();

        } catch (error) {
            await mongoSession.abortTransaction();
            mongoSession.endSession();
            throw error;
        }
    }

    async withdrawMoney(userId: string, amount: number) {
        const wallet = await this.walletModel.findOne({ user: userId });
        if (!wallet) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Wallet not found');
        }

        const pricingRules = await this.pricingRulesModel.findOne();
        const fee = pricingRules?.withdraw_fee || 0
        amount = amount - fee
        if (amount < (pricingRules?.min_withdraw_amount || 0)) {
            throw new ApiError(HttpStatus.BAD_REQUEST, 'Minimum withdrawal amount is ' + (pricingRules?.min_withdraw_amount || 0) / 100);
        }

        amount = amount * 100
        if (wallet.balance < amount) {
            throw new ApiError(HttpStatus.BAD_REQUEST, 'Insufficient balance');
        }

        const user = await this.userModel.findOne({ _id: userId }).lean();
        if (!user?.stripe_account_id) {
            throw new ApiError(HttpStatus.BAD_REQUEST, 'Stripe account not found');
        }

        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            await this.walletModel.updateOne({ _id: wallet._id }, { balance: wallet.balance - amount }).session(session);
            await this.stripeService.getClient().transfers.create({
                amount: amount,
                currency: 'usd',
                destination: user.stripe_account_id,
                description: 'Withdrawal',
            })
            await this.cacheService.del(`wallet:${userId}`)
            await this.snsService.publish('transaction.created', {
                title: "Withdrawal",
                amount: Number((amount / 100).toFixed(2)),
                ownerId: userId,
                platform_charge: fee,
                payment_status: TRANSACTION_PAYMENT_TYPE.DEBIT,
                type: TRANSACTION_TYPE.WITHDRAW,
                status: TRANSACTION_STATUS.COMPLETED
            } as CreateTransactionDto)

            this.snsService.publish('notification.send', {
                title: `Withdrawal Successful`,
                isRead: false,
                message: `Withdrawal of $${(amount / 100).toFixed(2)} from your wallet`,
                receiver: [userId],
                filePath: FilePathType.WITHDRAWAL,
                referenceId: userId
            } as CreateNotificationDto)

            this.snsService.publish('notification.send', {
                title: `${user?.name} has withdrawn $${(amount / 100).toFixed(2)}`,
                isRead: false,
                message: `${user?.name} has withdrawn $${(amount / 100).toFixed(2)} from your wallet`,
                receiver: [],
                filePath: FilePathType.WITHDRAWAL,
                referenceId: userId
            } as CreateNotificationDto)

            this.snsService.publish<CreateAuditLogsDto>('audit.create', {
                action: 'Withdrawal',
                user: userId as any,
                old_value: `${wallet.balance / 100}`,
                new_value: `${(wallet.balance - amount) / 100}`,
                reason: `Amount ${amount / 100} is debited from wallet`
            });

            await session.commitTransaction();
            session.endSession();
            return sendResponse({
                statusCode: HttpStatus.OK,
                message: 'Withdrawal successful',
                success: true,
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    @SqsConsumer('add.balance')
    async addBalanceUsingUserId(payload:{userId:string,amount:number}){
        await this.handler.addBalanceUsingUserId(payload)
    }
}

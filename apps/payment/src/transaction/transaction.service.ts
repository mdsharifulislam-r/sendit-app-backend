import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction, TransactionDocument } from './transaction.entity';
import mongoose, { Model } from 'mongoose';
import { CreateTransactionDto } from './transaction.dto';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { getDatePeriodRange, getDateRange, Period } from 'utils/helper/dateHelper';
import { RiskSettings, RiskSettingsDocument } from 'apps/admin/src/risk-settings/risk-settings.entity';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateRiskyItems, RISK_ITEM_TYPE, RISKY_ITEM_STATUS } from 'apps/admin/src/risk-settings/risk-settings.dto';

@Injectable()
export class TransactionService {
    constructor(
        @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
        @InjectModel(RiskSettings.name) private readonly riskSettingsModel: Model<RiskSettingsDocument>,
        private readonly cacheService: CacheService,
        private readonly snsService: SnsService,


    ) { }

    @SqsConsumer("transaction.created")
    async createTransaction(data: CreateTransactionDto) {

        const transaction = new this.transactionModel({
            ...data,
            owner: data.ownerId,
            ...(data.bookingId && { booking: data.bookingId }),
            ...(data.travelerId && { traveler: data.travelerId }),
            ...(data.transporterId && { transporter: data.transporterId }),
        });
        await transaction.save();
        await this.cacheService.deleteByPattern(`transaction:${data.ownerId}`)
        console.log(transaction, "============ transaction============");
        const riskSettings = await this.riskSettingsModel.findOne({}, { high_value_threshold: 1 })
        if (riskSettings?.high_value_threshold) {
            if (transaction.amount >= (riskSettings?.high_value_threshold || 0)) {
                this.snsService.publish<CreateRiskyItems>('risk.item.create', {
                    type: RISK_ITEM_TYPE.TRANSACTION,
                    description: `High value transaction`,
                    item: transaction._id,
                    status: RISKY_ITEM_STATUS.PENDNIG
                })
            }
        }
    }

    async getTransactions(userId: string, query: Record<string, any>) {
        const cache = await this.cacheService.get(`transaction:${userId}`, query)
        if (cache) {
            return cache
        }

        const { startDate, endDate } = getDateRange(Number(query.last_day) as any)
        const transactionQuery = new QueryBuilder(this.transactionModel.find({ owner: userId, ...(query.last_day ? { createdAt: { $gte: startDate, $lte: endDate } } : {}) }), query)
            .sort()
            .paginate()
            .search(['trx_id'])

        const [transactions, pagination] = await Promise.all([
            transactionQuery.modelQuery.lean(),
            transactionQuery.getPaginationInfo()
        ])
        await this.cacheService.set(`transaction:${userId}`, { transactions, pagination }, 60, query)
        return { transactions, pagination }
    }


    async getEarningsAndClientDistinctAmount(user: string, range: Period) {
        const { start_date, end_date } = getDatePeriodRange(range)
        const transactions = await this.transactionModel.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(user),
                    createdAt: {
                        $gte: new Date(start_date),
                        $lte: new Date(end_date)
                    },
                    booking: { $ne: null }
                }
            },
            {
                $group: {
                    _id: null,
                    total_amount: {
                        $sum: "$amount"
                    },
                    total_client: {
                        $addToSet: "$traveler"
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    total_amount: 1,
                    total_client: {
                        $size: "$total_client"
                    }
                }
            }
        ])

        return {
            total_amount: transactions[0]?.total_amount || 0,
            total_client: transactions[0]?.total_client || 0,
            range: range
        }
    }


    async getGraphOfWeeklyOrMonthlyEarning(
        userId: string,
        period: Period
    ) {
        const { start_date, end_date } = getDatePeriodRange(period);

        const transactions = await this.transactionModel.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),
                    booking: { $ne: null },
                },
            },
            {
                $group: {
                    _id:
                        period === "monthly"
                            ? { $month: "$createdAt" }
                            : { $dayOfWeek: "$createdAt" },
                    total_amount: {
                        $sum: "$amount",
                    },
                },
            },
        ]);

        if (period === "monthly") {
            const labels = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ];

            const result = labels.map((label) => ({
                label,
                total_amount: 0,
            }));

            transactions.forEach((item) => {
                const monthIndex = item._id - 1;
                result[monthIndex].total_amount = item.total_amount;
            });

            return result;
        }

        const result = [
            { label: "Mon", total_amount: 0 },
            { label: "Tue", total_amount: 0 },
            { label: "Wed", total_amount: 0 },
            { label: "Thu", total_amount: 0 },
            { label: "Fri", total_amount: 0 },
            { label: "Sat", total_amount: 0 },
            { label: "Sun", total_amount: 0 },
        ];

        const dayMap = {
            1: 6, // Sun
            2: 0, // Mon
            3: 1, // Tue
            4: 2, // Wed
            5: 3, // Thu
            6: 4, // Fri
            7: 5, // Sat
        };

        transactions.forEach((item) => {
            const index = dayMap[item._id];
            result[index].total_amount = item.total_amount;
        });

        return result;
    }
}

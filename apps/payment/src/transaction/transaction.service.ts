import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction, TransactionDocument } from './transaction.entity';
import { Model } from 'mongoose';
import { CreateTransactionDto } from './transaction.dto';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { getDateRange } from 'utils/helper/dateHelper';

@Injectable()
export class TransactionService {
    constructor(@InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
        private readonly cacheService: CacheService


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
}

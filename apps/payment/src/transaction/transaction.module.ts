import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from './transaction.entity';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { Booking, BookingSchema } from 'apps/booking/src/booking.entity';
import { Trip, TripSchema } from 'apps/trip/src/trip.entity';
import { StopDetails, StopDetailsSchema } from 'apps/trip/src/stop.entity';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { RedisCacheModule } from 'utils/helper-modules/cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Trip.name, schema: TripSchema },
      { name: StopDetails.name, schema: StopDetailsSchema },
    ]),
    SqsModule,
    AuthModule,
    RedisCacheModule
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule { }

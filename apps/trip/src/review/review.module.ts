import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './review.entity';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { Booking, BookingSchema } from 'apps/booking/src/booking.entity';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { RedisCacheModule } from 'utils/helper-modules/cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: User.name, schema: UserSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
    AuthModule,
    SqsModule,
    RedisCacheModule
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule { }

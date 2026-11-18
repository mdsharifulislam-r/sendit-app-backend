import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { StripeModule } from 'utils/helper-modules/stripe/stripe.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from 'apps/booking/src/booking.entity';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';

@Module({
    imports: [
        StripeModule,
        SqsModule,
        MongooseModule.forFeature([
            { name: Booking.name, schema: BookingSchema },
            { name: User.name, schema: UserSchema },
        ])
    ],
    providers: [CronService],
})
export class CronModule { }

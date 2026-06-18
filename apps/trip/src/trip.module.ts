import { Module } from '@nestjs/common';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'apps/root/src/user/user.entity';

import { AuthModule } from 'apps/root/src/auth/auth.module';
import { Trip, TripSchema } from './trip.entity';
import { StopDetails, StopDetailsSchema } from './stop.entity';
// import { KafkaModule } from 'utils/helper-modules/kafka/kafka.module';
import { Booking, BookingSchema } from 'apps/booking/src/booking.entity';
import { RedisCacheModule } from 'utils/helper-modules/cache/cache.module';
import { TransportAgreementModule } from 'apps/root/src/transport-agreement/transport-agreement.module';
import { TransportAgreement, TransportAgreementSchema } from 'apps/root/src/transport-agreement/transport-agreement.entity';
import { ReviewModule } from './review/review.module';

@Module({
  imports: [
    // ─── Config ──────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('DB_URI'),
      }),
    }),

    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Trip.name, schema: TripSchema },
      { name: StopDetails.name, schema: StopDetailsSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: TransportAgreement.name, schema: TransportAgreementSchema },
    ]),
    AuthModule,
    // KafkaModule,
    RedisCacheModule,
    TransportAgreementModule,
    ReviewModule

  ],
  controllers: [TripController],
  providers: [TripService],
})
export class TripModule { }

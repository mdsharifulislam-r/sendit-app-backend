import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User, UserSchema } from './user.entity';
import { AuthModule } from '../auth/auth.module';
import { Trip, TripSchema } from 'apps/trip/src/trip.entity';
import { StopDetails, StopDetailsSchema } from 'apps/trip/src/stop.entity';
import { Booking, BookingSchema } from 'apps/booking/src/booking.entity';
import { RiskSettings, RiskSettingsSchema } from 'apps/admin/src/risk-settings/risk-settings.entity';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Trip.name, schema: TripSchema },
      { name: StopDetails.name, schema: StopDetailsSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: RiskSettings.name, schema: RiskSettingsSchema },
    ]),
    AuthModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, MongooseModule],
})
export class UserModule { }

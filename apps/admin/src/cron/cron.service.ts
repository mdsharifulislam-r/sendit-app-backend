import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { BOOKING_STATUS } from 'apps/booking/src/booking.dto';
import { Booking, BookingDocument } from 'apps/booking/src/booking.entity';
import { CreateNotificationDto, FilePathType } from 'apps/communication/src/communication.dto';

import { Connection, Model } from 'mongoose';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateAuditLogsDto } from '../audit-logs/audit-logs.dto';
import { StripeService } from 'utils/helper-modules/stripe/stripe.service';

@Injectable()
export class CronService {
    constructor(
        @InjectModel(Booking.name)
        private readonly bookingModel: Model<BookingDocument>,
        private readonly snsService: SnsService,
        private readonly stripeService: StripeService,
        @InjectConnection() private readonly connection: Connection,
    ) { }
    private readonly logger = new Logger(CronService.name);

    @Cron('*/10 * * * * *')
    async handleCron() {
        // this.logger.log('Cron job executed');
        await this.giveRemimderBeforeBooking()
        await this.cancelBooking()
    }


    async giveRemimderBeforeBooking() {
        // bookings which createdAt is more 10 hours
        const tenHoursBefore = Date.now() - 10 * 60 * 60 * 1000;
        const bookings = await this.bookingModel.find({
            createdAt: { $lt: tenHoursBefore },
            status: BOOKING_STATUS.PENDING,
        });

        // notify those bookings about cancel after 14 hours

        const fourteenHoursAfter = new Date(Date.now() + 14 * 60 * 60 * 1000).toLocaleString()

        await Promise.all(

            bookings.map((booking) => {

                this.snsService.publish<CreateNotificationDto>('notifcation.send', {
                    title: 'Booking Reminder',
                    message: `Your booking ${booking.id} will be cancelled after ${fourteenHoursAfter}. Please confirm the booking`,
                    isRead: false,
                    filePath: FilePathType.BOOKING,
                    receiver: [booking.transporter.toString()],
                    referenceId: booking._id.toString()
                }),

                    this.snsService.publish<CreateNotificationDto>('notifcation.send', {
                        title: 'Booking Reminder',
                        message: `Your booking ${booking.id} will be cancelled after ${fourteenHoursAfter}. if transporter will not confirm the booking within ${fourteenHoursAfter} it will automatically cancelled`,
                        isRead: false,
                        filePath: FilePathType.BOOKING,
                        receiver: [booking.sender.toString()],
                        referenceId: booking._id.toString()
                    })


            })

        )
        if (bookings.length > 0) {
            this.logger.log(`Reminder sent for ${bookings.length} bookings`)
        }



    }


    // cancel booking after 24 hours
    async cancelBooking() {
        const twentyFourHoursBefore = Date.now() - 24 * 60 * 60 * 1000;
        const bookings = await this.bookingModel.find({
            createdAt: { $lt: twentyFourHoursBefore },
            status: BOOKING_STATUS.PENDING,
        });

        await Promise.all(

            bookings.map(async (booking) => {
                const session = await this.connection.startSession();
                session.startTransaction();
                try {

                    await this.bookingModel.updateOne({
                        _id: booking._id
                    }, {
                        $set: {
                            status: BOOKING_STATUS.CANCELLED,
                            cancellation_reason: 'Booking not confirmed within 24 hours',
                        }
                    }, { session })

                    await this.stripeService.getClient().refunds.create({
                        payment_intent: booking.payment_intent_id,
                        reason: 'requested_by_customer',
                    })

                    this.snsService.publish<CreateNotificationDto>('notifcation.send', {
                        title: 'Booking Cancelled',
                        message: `Your booking ${booking.id} has been cancelled due to not being confirmed within 24 hours`,
                        isRead: false,
                        filePath: FilePathType.BOOKING,
                        receiver: [booking.transporter.toString()],
                        referenceId: booking._id.toString()
                    }),

                        this.snsService.publish<CreateNotificationDto>('notifcation.send', {
                            title: 'Booking Cancelled',
                            message: `Your booking ${booking.id} has been cancelled due to not being confirmed within 24 hours`,
                            isRead: false,
                            filePath: FilePathType.BOOKING,
                            receiver: [booking.sender.toString()],
                            referenceId: booking._id.toString()
                        }),

                        this.snsService.publish<CreateAuditLogsDto>("audit.create", {
                            action: `Booking ${booking.id} has been cancelled.`,
                            new_value: BOOKING_STATUS.CANCELLED,
                            old_value: booking.status,
                            reason: 'Booking not confirmed within 24 hours',
                            user: booking.sender
                        })
                    await session.commitTransaction();
                    this.logger.log(`Booking ${booking.id} has been cancelled successfully`)
                } catch (error) {
                    await session.abortTransaction();
                    throw error;
                } finally {
                    session.endSession();
                }

            })
        )

    }



}
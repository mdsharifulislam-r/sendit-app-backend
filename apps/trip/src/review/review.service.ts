import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Review } from './review.entity';
import { CreateReviewDto, ReviewType } from './review.dto';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { CreateNotificationDto, FilePathType } from 'apps/communication/src/communication.dto';
import { Booking } from 'apps/booking/src/booking.entity';
import { ApiError } from 'utils/errors/api-error';
import { BOOKING_STATUS } from 'apps/booking/src/booking.dto';
import { User } from 'apps/root/src/user/user.entity';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import sendResponse from 'utils/helper/sendResponse';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';
import { CacheService } from 'utils/helper-modules/cache/cache.service';
import { CreateAuditLogsDto } from 'apps/admin/src/audit-logs/audit-logs.dto';

@Injectable()
export class ReviewService {
    constructor(
        @InjectModel(Review.name) private reviewModel: Model<Review>,
        @InjectModel(Booking.name) private bookingModel: Model<Booking>,
        @InjectModel(User.name) private userModel: Model<User>,
        private readonly snsService: SnsService,
        private readonly cacheService: CacheService
    ) { }


    async create(createReviewDto: CreateReviewDto) {

        if (createReviewDto.type == ReviewType.BOOKING) {
            const booking = await this.bookingModel.findById(createReviewDto.booking)
            if (!booking) {
                throw new ApiError(404, "Booking not found")
            }
            if (booking.status != BOOKING_STATUS.DELIVERED) {
                throw new ApiError(400, "Booking not delivered")
            }
            createReviewDto.transporter = booking.transporter
        }
        const review = await (await this.reviewModel.create(createReviewDto)).populate('user')
        if (review.type == ReviewType.PLATFORM) {
            this.snsService.publish<CreateNotificationDto>('notification.send', {
                title: 'New Review',
                message: `New review from ${(review.user as any).name}`,
                isRead: false,
                receiver: [],
                filePath: FilePathType.REVIEW,
                referenceId: review._id.toString(),
            })

            this.snsService.publish<CreateAuditLogsDto>("audit.create", {
                action: "Review created",
                user: review.user as any,
                old_value: ``,
                new_value: ``,
                reason: "Review created"
            })

            await this.cacheService.deleteByPattern('platform_review')
        }
        else if (review.type == ReviewType.BOOKING) {
            await this.snsService.publish<CreateNotificationDto>('notification.send', {
                title: 'New Review',
                message: `New review from ${(review.user as any).name}`,
                isRead: false,
                receiver: [review?.transporter!.toString()],
            })

            await this.snsService.publish<{ userId: string }>('review.calculate', { userId: review.transporter.toString() })
        }

        await this.snsService.publish<CreateNotificationDto>('notification.send', {
            title: 'Review Submitted',
            message: `Your review has been submitted successfully`,
            isRead: false,
            receiver: [review?.user._id.toString()],
            filePath: FilePathType.REVIEW,
            referenceId: review._id.toString(),
        })

        return sendResponse({
            message: 'Review submitted successfully',
            statusCode: 201,
            success: true
        })
    }


    @SqsConsumer('review.calculate')
    async calculateAvgRatingAndSave(payload: { userId: string }) {
        const avgRating = await this.reviewModel.aggregate([
            {
                $match: {
                    transporter: new mongoose.Types.ObjectId(payload.userId),
                },
            },
            {
                $group: {
                    _id: '$user',
                    avgRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 },
                },
            },
        ])

        await this.userModel.findByIdAndUpdate(payload.userId, {
            avg_rating: avgRating?.length > 0 ? avgRating[0]?.avgRating : 0,
            review_count: avgRating?.length > 0 ? avgRating[0]?.reviewCount : 0,
        })
    }


    async getAllPlatformReview(query: Record<string, any>) {
        const cache = await this.cacheService.get('platform_review', query)
        if (cache) {
            return cache
        }
        const reviewQuery = new QueryBuilder(this.reviewModel.find({ type: ReviewType.PLATFORM }), query).paginate().sort().filter()
        const [reviews, pagination] = await Promise.all([
            reviewQuery.modelQuery.populate({
                path: "user",
                select: {
                    name: 1,
                    email: 1,
                    image: 1
                }
            }).lean(),
            reviewQuery.getPaginationInfo()
        ])

        await this.cacheService.set('platform_review', { reviews, pagination }, 360, query)

        return { reviews, pagination }
    }

    async changeStatus(id: string, status: any) {
        const review = await this.reviewModel.findById(id)
        if (!review) {
            throw new ApiError(404, "Review not found")
        }
        await this.reviewModel.findByIdAndUpdate(id, { status })
        await this.cacheService.deleteByPattern('platform_review')

        this.snsService.publish<CreateAuditLogsDto>("audit.create", {
            action: "Review status changed",
            user: review.user as any,
            old_value: review.status,
            new_value: status,
            reason: "Review status changed"
        })

        return sendResponse({
            message: 'Review status changed successfully',
            statusCode: 200,
            success: true
        })
    }
}

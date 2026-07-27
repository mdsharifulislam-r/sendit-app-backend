import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ReviewService } from './review.service';
import { Auth } from 'utils/guards/auth.guard';
import { ChangeReviewStatusDto, CreateReviewDto } from './review.dto';
import { CurrentUser } from 'utils/decorators/user.decorator';
import { USER_ROLES } from 'utils/enums/user';
import sendResponse from 'utils/helper/sendResponse';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  @Post()
  @Auth()
  createReview(@Body() data: CreateReviewDto, @CurrentUser() user: any) {
    data.user = user.id
    return this.reviewService.create(data)
  }


  @Get()
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  async getAllPlatformReview(@Query() query: any) {
    const data = await this.reviewService.getAllPlatformReview(query) as any
    return sendResponse({
      message: 'Get All Platform Review',
      data: data.reviews,
      success: true,
      statusCode: 200,
      pagination: data.pagination
    })
  }

  @Patch(':id')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  changeReviewStatus(@Param('id') id: string, @Body() data: ChangeReviewStatusDto) {
    return this.reviewService.changeStatus(id, data.status)
  }
}

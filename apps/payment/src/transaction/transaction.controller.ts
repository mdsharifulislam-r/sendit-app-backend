import { Controller, Get, Query } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { Auth } from 'utils/guards/auth.guard';
import { CurrentUser } from 'utils/decorators/user.decorator';
import sendResponse from 'utils/helper/sendResponse';
import { GetEarningsAndClientAmount } from 'apps/booking/src/booking.dto';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) { }

  @Get()
  @Auth()
  async getTransactions(@Query() query: any, @CurrentUser() user: any) {
    const data = await this.transactionService.getTransactions(user.id, query) as any
    return sendResponse({
      message: 'Transaction fetched successfully',
      success: true,
      statusCode: 200,
      data: data.transactions,
      pagination: data.pagination
    })
  }

  @Get('earnings')
  @Auth()
  async getEarnings(@Query() query: GetEarningsAndClientAmount, @CurrentUser() user: any) {
    const data = await this.transactionService.getEarningsAndClientDistinctAmount(user.id, query.range)
    return sendResponse({
      message: 'Earnings fetched successfully',
      success: true,
      statusCode: 200,
      data: data,
    })
  }

  @Get('graph-of-weekly-or-monthly-earning')
  @Auth()
  async getGraphOfWeeklyOrMonthlyEarning(@Query() query: GetEarningsAndClientAmount, @CurrentUser() user: any) {
    const data = await this.transactionService.getGraphOfWeeklyOrMonthlyEarning(user.id, query.range)
    return sendResponse({
      message: 'Graph of weekly or monthly earning fetched successfully',
      success: true,
      statusCode: 200,
      data: data,
    })
  }
}

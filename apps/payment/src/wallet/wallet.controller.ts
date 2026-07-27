import { Body, Controller, HttpStatus } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { Get, Post } from '@nestjs/common';


import { Request } from 'express';
import { Auth } from 'utils/guards/auth.guard';
import { CurrentUser } from 'utils/decorators/user.decorator';
import { DepositIntoWalletDto, WithdrawFromWalletDto } from './wallet.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import sendResponse from 'utils/helper/sendResponse';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Post('deposit')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Deposit into wallet',
    description: 'Deposit into wallet',
  })
  async deposit(@CurrentUser() user: any, @Body() dto: DepositIntoWalletDto) {
    return await this.walletService.depositIntoWallet(user.id, dto.amount)
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Get wallet balance',
  })
  @Auth()
  async getWalletBalance(@CurrentUser() user: any) {
    const data = await this.walletService.getWalletBalance(user.id)
    return sendResponse({
      statusCode: HttpStatus.OK,
      message: 'Wallet balance',
      data,
      success: true,
    })
  }

  @Get('connect-stripe-account')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Connect stripe connected account',
    description: 'Connect stripe connected account',
  })
  async connectStripeConnectedAccount(@CurrentUser() user: any) {
    return await this.walletService.connectStripeConnectedAccount(user.id)
  }

  @Post('withdrawal')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Withdraw from wallet',
    description: 'Withdraw from wallet',
  })
  async withdrawal(@CurrentUser() user: any, @Body() dto: WithdrawFromWalletDto) {
    return await this.walletService.withdrawMoney(user.id, dto.amount)
  }

  @Get('stats')
  @Auth()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get wallet stats',
    description: 'Get wallet stats',
  })
  getWalletStats(@CurrentUser() user: any) {
    return this.walletService.getWalletStats(user.id)

  }
}

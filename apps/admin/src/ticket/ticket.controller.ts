import { Controller, Get, Post, Body, Param, HttpCode, UseGuards, Req, Query } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketDto, ResolveTicketDto } from './ticket.dto';

import { ApiBearerAuth } from '@nestjs/swagger';

import { User } from 'apps/root/src/user/user.entity';
import { Request } from 'express';
import { Auth } from 'utils/guards/auth.guard';
import { USER_ROLES } from 'utils/enums/user';
import { CurrentUser } from 'utils/decorators/user.decorator';
import sendResponse from 'utils/helper/sendResponse';

@Controller('ticket')
@ApiBearerAuth('JWT-auth')

export class TicketController {
  constructor(private readonly ticketService: TicketService) { }



  @Post('create')
  @HttpCode(201)
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  async createTicket(@Body() createTicketDto: CreateTicketDto, @CurrentUser() user: any) {
    return this.ticketService.createTicket(createTicketDto, user.id);
  }

  @Get()
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  @HttpCode(200)
  async getAllTicket(@Query() query: Record<string, any>) {
    const result = await this.ticketService.getAllTicket(query) as any
    return sendResponse({
      success: true,
      statusCode: 200,
      message: 'Ticket fetched successfully',
      data: result.tickets,
      pagination: result.pagination
    })
  }


  @Post(':id/resolve')
  @HttpCode(200)
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  async resolveTicket(@Param('id') id: string, @Body() payload: ResolveTicketDto, @CurrentUser() user: any) {
    return this.ticketService.resolveTicket(id, payload, user.id);
  }


}

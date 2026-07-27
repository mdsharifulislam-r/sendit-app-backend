import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Auth } from 'utils/guards/auth.guard';
import { CreateChatDto } from './chat.dto';
import { CurrentUser } from 'utils/decorators/user.decorator';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post('create')
  @Auth()
  createChat(@Body() data: CreateChatDto, @CurrentUser() user: any) {
    return this.chatService.createChat(data as any, user.id)
  }

  @Get()
  @Auth()
  getChats(@CurrentUser() user: any, @Query() query: any) {
    return this.chatService.getChats(user.id, query)
  }

  @Delete(':id')
  @Auth()
  deleteChat(@CurrentUser() user: any, @Param('id') chatId:string) {
    return this.chatService.deleteChat(chatId, user.id)
  }

  @Patch('archive/:id')
  @Auth()
  archiveChat(@CurrentUser() user: any, @Param('id') id: string) {
    return this.chatService.archiveChat(id, user.id)
  }

}

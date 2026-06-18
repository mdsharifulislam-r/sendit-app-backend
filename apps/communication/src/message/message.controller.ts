import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MessageService } from './message.service';
import { Auth } from 'utils/guards/auth.guard';
import { FileUpload } from 'utils/decorators/file-uploader.decorator';
import { CreateMessageDto } from './message.dto';
import { CurrentUser } from 'utils/decorators/user.decorator';
import { GetFile } from 'utils/decorators/get-file.decorator';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) { }

  @Post('')
  @Auth()
  @FileUpload({
    fields: [
      {
        fieldName: 'images',
        maxCount: 10
      },
      {
        fieldName: 'documents',
        maxCount: 10
      },

    ]
  })
  create(@Body() createMessageDto: CreateMessageDto, @CurrentUser() user: any, @GetFile('images') images: string[], @GetFile('documents') documents: string[]) {
    const payload = {
      ...createMessageDto,
      sender: user.id,
      images,
      documents
    }
    return this.messageService.sendMessage(payload);
  }


  @Get(':id')
  @Auth()
  getMessageByChat(@Param('id') id: string, @Query() query: Record<string, any>, @CurrentUser() user: any) {


    return this.messageService.getMessageByChat(id, query, user.id);
  }
}

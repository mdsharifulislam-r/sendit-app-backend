import { Body, Controller, Post } from '@nestjs/common';
import { TransportAgreementService } from './transport-agreement.service';
import { CreateTransportAgreementDto } from './transport-agreement.dto';
import { CurrentUser } from 'utils/decorators/user.decorator';
import { FileUpload } from 'utils/decorators/file-uploader.decorator';
import { Auth } from 'utils/guards/auth.guard';
import { GetFile } from 'utils/decorators/get-file.decorator';

@Controller('transport-agreement')
export class TransportAgreementController {
  constructor(private readonly transportAgreementService: TransportAgreementService) { }

  @Post('sign-agreement')
  @Auth()
  @FileUpload({
    fields: [
      {
        fieldName: 'singnature_image',
        maxCount: 1
      }
    ],
  })
  signAgreement(@Body() payload: CreateTransportAgreementDto, @CurrentUser() user: any, @GetFile('singnature_image') singnature_image: string[]) {

    if (singnature_image) {
      payload.singnature_image = singnature_image[0]
    }
    return this.transportAgreementService.signAgreement(payload, user.id)
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto, RefundOnReportDto } from './report.dto';
import { CurrentUser } from 'utils/decorators/user.decorator';
import { Auth } from 'utils/guards/auth.guard';
import { FileUpload } from 'utils/decorators/file-uploader.decorator';
import { GetFile } from 'utils/decorators/get-file.decorator';
import { USER_ROLES } from 'utils/enums/user';
import sendResponse from 'utils/helper/sendResponse';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) { }

  @Post()
  @Auth()
  @FileUpload({
    fields: [{
      fieldName: 'attachments',
      maxCount: 3,

    }]
  })
  createReport(@Body() data: any, @CurrentUser() user: any, @GetFile('attachments') attachments: string[]) {
    data.attachments = attachments
    return this.reportService.createReport(user.id, data);
  }

  @Get()
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  async getReports(@Query() query: any) {
    const data = await this.reportService.getReports(query) as any
    return sendResponse({
      statusCode: 200,
      data: data.reports,
      message: 'Reports fetched successfully',
      success: true,
      pagination: data.pagination,
    });
  }

  @Post('admin-report')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  createAdminReport(@Body() data: CreateReportDto, @CurrentUser() user: any) {
    return this.reportService.createReportFromAdmin(data, user.id);
  }

  @Post('create-chat-with-support/:id')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  createChatWithSupport(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reportService.createChatWithSupport(id);
  }

  @Post('refund')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  refundRequestForAdmin(@Body() data: RefundOnReportDto, @CurrentUser() user: any) {
    return this.reportService.refundRequestForAdmin(data, user.id);
  }

  @Get(':reportId')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  async getSingleReport(@Param('reportId') reportId: string) {
    return this.reportService.getSingleReport(reportId);
  }

  @Patch(':reportId')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  async updateReport(@Param('reportId') reportId: string, @Body() data: any) {
    return this.reportService.updateReport(reportId, data);
  }

  @Delete(':reportId')
  @Auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)
  async deleteReport(@Param('reportId') reportId: string) {
    return this.reportService.deleteReport(reportId);
  }






}

import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { Auth } from 'utils/guards/auth.guard';
import { CurrentUser } from 'utils/decorators/user.decorator';
import sendResponse from 'utils/helper/sendResponse';
import { USER_ROLES } from 'utils/enums/user';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) { }
  @Get()
  @Auth()
  async getAuditLogs(@CurrentUser() user: any, @Query() query: Record<string, any>) {
    const data = await this.auditLogsService.getAuditLogs(user, query);
    return sendResponse({
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Audit logs fetched successfully',
      data: data.logs,
      pagination: data.pagination,
    });
  }
}

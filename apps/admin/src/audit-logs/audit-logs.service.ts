import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AuditLog } from './audit-logs.entity';
import { Model } from 'mongoose';
import { CreateAuditLogsDto } from './audit-logs.dto';
import { SqsConsumer } from 'utils/decorators/sqs-consumer';
import { User } from 'apps/root/src/user/user.entity';
import { SocketService } from 'utils/helper-modules/socket/socket.service';
import { USER_ROLES } from 'utils/enums/user';
import QueryBuilder from 'utils/queryBuilder/queryBuilder';

@Injectable()
export class AuditLogsService {
    constructor(
        @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLog>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        private readonly socketService: SocketService
    ) { }
    @SqsConsumer('audit.create')
    async createAuditLog(payload: CreateAuditLogsDto) {
        const { action, user, old_value, new_value, reason } = payload
        const auditLog = await (await this.auditLogModel.create({
            action,
            user,
            old_value,
            new_value,
            reason
        })).populate('user', 'name email role image')

        const admins = await this.userModel.find({ role: { $in: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] } }).distinct('_id')

        admins.forEach((admin) => {
            this.socketService.emit(`get-audits::${admin.toString()}`, auditLog)
        })



    }

    async getAuditLogs(user: { id: string, role: any }, query: Record<string, any>) {

        const initQuery = ![USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(user.role) ? { user: user.id } : {}

        const auditQuery = new QueryBuilder(this.auditLogModel.find(initQuery), query)
            .filter([])
            .sort()
            .search(['action', 'old_value', 'new_value', 'reason'])

        const [logs, pagination] = await Promise.all([
            auditQuery.modelQuery.populate('user', 'name email role image').lean(),
            auditQuery.getPaginationInfo()
        ])

        return { logs, pagination }
    }
}

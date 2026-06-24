import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './audit-logs.entity';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { AuthModule } from 'apps/root/src/auth/auth.module';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';
import { SocketModule } from 'utils/helper-modules/socket/socket.module';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }, { name: User.name, schema: UserSchema }]),
    AuthModule,
    SqsModule,
    SocketModule
  ],
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
})
export class AuditLogsModule { }

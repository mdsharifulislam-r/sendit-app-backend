import { Types } from "mongoose";

export class CreateAuditLogsDto {
    action: string;
    user: Types.ObjectId
    old_value: string
    new_value: string
    reason: string
}
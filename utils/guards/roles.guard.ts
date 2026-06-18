import { SetMetadata } from '@nestjs/common';
import { USER_ROLES } from '../enums/user';

export const Roles = (...roles: USER_ROLES[]) => SetMetadata('roles', roles);

import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { USER_ROLES } from '../enums/user';
import { ApiError } from '../errors/api-error';
import { Roles } from './roles.guard';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<USER_ROLES[]>('roles', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'Missing or malformed Authorization header. Expected: Bearer <token>',
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;

      if (roles?.length && !roles.includes(payload.role)) {
        throw new ApiError(
          HttpStatus.FORBIDDEN,
          `Access denied. Required role(s): ${roles.join(', ')}`,
        );
      }

      return true;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid or expired token');
    }
  }
}

/** Shorthand decorator: @Auth() or @Auth(USER_ROLES.ADMIN) */
export function Auth(...roles: USER_ROLES[]) {
  return applyDecorators(Roles(...roles), UseGuards(AuthGuard));
}

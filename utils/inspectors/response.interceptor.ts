import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {

    return next.handle().pipe(
      map((data) => {
        if (!data || typeof data !== 'object') return data;

        const { success, message, statusCode, pagination, data: payload } = data;
        if (statusCode) {
          context.switchToHttp().getResponse().status(statusCode);
        }
        return {
          success: success ?? true,
          statusCode: statusCode ?? context.switchToHttp().getResponse().statusCode,
          message: message ?? 'Request successful',
          ...(pagination && { pagination }),
          ...(payload !== undefined && { data: payload }),
        };
      }),
    );
  }
}

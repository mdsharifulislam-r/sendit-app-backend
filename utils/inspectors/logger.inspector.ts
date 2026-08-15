import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, ip, headers } = req;
    const path = (req.path || originalUrl || '').split('?')[0];

    if (this.isHealthCheck(path, headers['user-agent'])) {
      return next.handle();
    }

    const userAgent = headers['user-agent'] || 'unknown';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const duration = Date.now() - start;
        this.logger.log(
          `${method} ${originalUrl} → ${res.statusCode} | ${duration}ms | ${ip} | ${userAgent}`,
        );
      }),
      catchError((err) => {
        const duration = Date.now() - start;
        this.logger.error(
          `${method} ${originalUrl} → ERROR | ${duration}ms | ${ip} | ${err.message}`,
        );
        return throwError(() => err);
      }),
    );
  }

  private isHealthCheck(path: string, userAgent?: string): boolean {
    const normalized = path.replace(/\/+$/, '') || '/';
    if (normalized === '/health' || normalized.endsWith('/health')) {
      return true;
    }
    return Boolean(userAgent?.includes('ELB-HealthChecker'));
  }
}

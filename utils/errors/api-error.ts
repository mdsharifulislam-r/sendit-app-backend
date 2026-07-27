import { HttpException, HttpStatus, Logger } from '@nestjs/common';

/**
 * Custom application error that:
 * - Extends HttpException for NestJS compatibility
 * - Auto-logs the error when thrown
 * - Returns a consistent { success, statusCode, message } shape
 */
export class ApiError extends HttpException {
  private static readonly logger = new Logger('ApiError');

  constructor(statusCode: HttpStatus, message: string) {
    super({ statusCode, message, success: false }, statusCode);
    ApiError.logger.warn(`[${statusCode}] ${message}`);
  }
}

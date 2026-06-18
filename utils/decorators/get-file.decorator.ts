import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getPublicUrl } from '../helper/nomaliseFiles';

/**
 * Extracts an uploaded file's public URL from the request.
 * Usage: @GetFile('fieldName')
 */
export const GetFile = createParamDecorator(
  (fieldName: string, ctx: ExecutionContext): string | string[] | null => {
    const request = ctx.switchToHttp().getRequest();

    if (request.files) {
      if (fieldName) {
        const file = request.files[fieldName]
        return getPublicUrl(file) as string | null;
      }
      const file = request.files
      return getPublicUrl(file) as string | null;
    }

    if (request.file) {
      // FileInterceptor: single file
      return getPublicUrl(request.file) as string | null;
    }

    return null;
  },
);

import { BadRequestException, ValidationError } from '@nestjs/common';

function flattenErrors(
  errors: ValidationError[],
  result: Record<string, string> = {},
): Record<string, string> {
  for (const error of errors) {
    if (error.constraints) {
      result[error.property] = Object.values(error.constraints)[0];
    }
    if (error.children?.length) {
      flattenErrors(error.children, result);
    }
  }
  return result;
}

/**
 * Custom ValidationPipe exceptionFactory.
 * Returns a structured { success, message, errors } response.
 */
export const formatValidationErrors = (errors: ValidationError[]) => {
  const formatted = flattenErrors(errors);
  const firstMessage = Object.values(formatted)[0] ?? 'Validation failed';

  return new BadRequestException({
    success: false,
    message: firstMessage,
    errors: formatted,
  });
};

/**
 * Parses CORS_ORIGIN env var into a value accepted by NestJS/Express cors middleware.
 * Supports a single origin, comma-separated origins, or '*' for all origins.
 */
export function getCorsOrigin(): string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === '*') {
    return '*';
  }

  const origins = raw.split(',').map((origin) => origin.trim()).filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

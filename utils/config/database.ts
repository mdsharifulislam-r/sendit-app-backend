import { ConfigService } from '@nestjs/config';

/**
 * Mongoose connection options.
 * DocumentDB requires SCRAM-SHA-1 (not the driver's default SCRAM-SHA-256).
 */
export function mongooseFactory(config: ConfigService) {
  const uri =
    config.get<string>('DB_URI') || 'mongodb://localhost:27017/sendit';

  return {
    uri,
    authMechanism: 'SCRAM-SHA-1' as const,
  };
}

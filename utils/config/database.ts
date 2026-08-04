import { ConfigService } from '@nestjs/config';

/**
 * Mongoose connection options.
 * DocumentDB requires SCRAM-SHA-1 (not the driver's default SCRAM-SHA-256).
 */
export function mongooseFactory(config: ConfigService) {
  const uri =
    config.get<string>('DB_URI') || 'mongodb://localhost:27017/sendit';

  const options: { uri: string; authMechanism?: 'SCRAM-SHA-1' } = { uri };

  const hasCredentials = /mongodb(\+srv)?:\/\/[^/@\s]+@/.test(uri);
  const isDocumentDb =
    uri.includes('docdb.amazonaws.com') ||
    (hasCredentials && uri.includes('tls=true'));

  if (isDocumentDb && !uri.includes('authMechanism=')) {
    options.authMechanism = 'SCRAM-SHA-1';
  }

  // DocumentDB transactions require primary read preference
  if (isDocumentDb && uri.includes('readPreference=secondaryPreferred')) {
    options.uri = uri.replace(
      'readPreference=secondaryPreferred',
      'readPreference=primary',
    );
  }

  return options;
}

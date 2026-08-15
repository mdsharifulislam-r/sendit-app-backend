import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { Logger } from '@nestjs/common';

const logger = new Logger('AwsSecrets');

/**
 * Loads secrets from AWS Secrets Manager into process.env **before**
 * NestFactory.create() is called.
 *
 * This is required because NestJS modules (MongooseModule, JwtModule,
 * RedisCacheModule, etc.) read env vars at initialization time inside
 * NestFactory.create(). If secrets are loaded after, those modules will
 * already have read empty/wrong values.
 *
 * Usage — call this as the very first line in every service's bootstrap():
 * ```ts
 * async function bootstrap() {
 *   await loadAwsSecrets();            // ← must be first
 *   const app = await NestFactory.create(AppModule);
 *   ...
 * }
 * ```
 *
 * Required env vars (set in .env or container task definition):
 *   AWS_REGION        — e.g. "eu-central-1"
 *   AWS_SECRET_NAME   — e.g. "sendit-dev-app-secret"
 *
 * In local/dev mode those vars can be omitted; the function will log a
 * warning and return without throwing so that .env file values are used.
 */
export async function loadAwsSecrets(): Promise<void> {
  const secretName = process.env.AWS_SECRET_NAME;
  const region = process.env.AWS_REGION;

  if (!secretName || !region) {
    logger.warn(
      'AWS_SECRET_NAME or AWS_REGION not set — skipping Secrets Manager (local/.env mode)',
    );
    return;
  }

  try {
    const client = new SecretsManagerClient({ region });
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName }),
    );

    const secretObject: Record<string, string> = JSON.parse(
      response.SecretString ?? '{}',
    );

    // Never let Secrets Manager overwrite infrastructure env injected by ECS
    // (SNS/SQS URLs, IAM, DB, Redis). A full .env upload would break messaging.
    const infrastructureKeys = new Set([
      'AWS_REGION',
      'AWS_SECRET_NAME',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_SESSION_TOKEN',
      'AWS_BUCKET_NAME',
      'SNS_TOPIC_ARN',
      'SQS_QUEUE_URL',
      'SERVICE_NAME',
      'NODE_ENV',
      'DB_URI',
      'REDIS_HOST',
      'REDIS_PORT',
      'REDIS_TLS',
      'PORT',
      'TRIP_SERVER_PORT',
      'COMMUNICATION_PORT',
      'BOOKING_PORT',
      'PAYMENT_PORT',
      'ADMIN_PORT',
      'IP_ADDRESS',
    ]);

    let loaded = 0;
    for (const [key, value] of Object.entries(secretObject)) {
      if (infrastructureKeys.has(key) || key.endsWith('_SQS_QUEUE_URL')) {
        continue;
      }
      process.env[key] = value ?? '';
      loaded++;
    }

    logger.log(`✅ Loaded ${loaded} secrets from "${secretName}"`);
  } catch (err) {
    logger.error(
      `❌ Failed to load AWS Secrets Manager secret "${secretName}": ${(err as Error).message}`,
    );
    // Fatal in production — crash so ECS/container orchestration restarts the task
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

import { ConfigService } from '@nestjs/config';

/** Redis socket options — ElastiCache in AWS uses TLS; local Redis usually does not. */
export function redisSocketOptions(config: ConfigService) {
  const host = config.get<string>('REDIS_HOST') || 'localhost';
  const port = Number(config.get<number>('REDIS_PORT') || 6379);
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const useTls =
    config.get<string>('REDIS_TLS') === 'true' ||
    (!isLocal && host.includes('amazonaws.com'));

  return {
    host,
    port,
    connectTimeout: 10_000,
    ...(useTls ? { tls: true } : {}),
  };
}

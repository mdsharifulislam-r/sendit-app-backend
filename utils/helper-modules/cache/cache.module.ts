import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { createClient } from 'redis';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: config.get<string>('REDIS_HOST'),
            port: Number(config.get<number>('REDIS_PORT')),
          },
        }),
      }),
    }),
  ],

  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (config: ConfigService) => {
        const client = createClient({
          socket: {
            host: config.get<string>('REDIS_HOST'),
            port: Number(config.get<number>('REDIS_PORT')),
          },
        });

        await client.connect();

        return client;
      },
      inject: [ConfigService],
    },

    CacheService,
  ],

  exports: [CacheService, 'REDIS_CLIENT'],
})
export class RedisCacheModule { }
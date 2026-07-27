import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { RedisClientType } from 'redis';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,

    @Inject('REDIS_CLIENT')
    private readonly redis: RedisClientType,
  ) { }

  // =========================
  // KEY BUILDER
  // =========================
  private buildKey(key: string, query?: Record<string, any>) {
    if (!query) return `${key}:1`;

    const sorted = Object.keys(query)
      .sort()
      .reduce((acc, k) => {
        acc[k] = query[k];
        return acc;
      }, {} as Record<string, any>);

    return `${key}:${new URLSearchParams(sorted).toString()}`;
  }

  // =========================
  // GET
  // =========================
  async get<T>(key: string, query?: Record<string, any>): Promise<T | null> {
    const fullKey = this.buildKey(key, query);
    console.log('[CacheService GET] key:', fullKey);

    const data = await this.redis.get(fullKey);
    console.log('[CacheService GET] result:', data ? 'FOUND' : 'NOT FOUND');

    if (!data) return null;
    return JSON.parse(data) as T;
  }

  // =========================
  // SET
  // =========================
  async set(
    key: string,
    value: any,
    ttl = 60,
    query?: Record<string, any>,
  ) {
    const fullKey = this.buildKey(key, query);
    console.log('[CacheService SET] key:', fullKey, 'ttl:', ttl, 'seconds');

    await this.redis.set(fullKey, JSON.stringify(value), { EX: ttl });

    // Verify it was stored
    const verify = await this.redis.get(fullKey);
    console.log('[CacheService SET] verify after set:', verify ? 'STORED OK' : 'STORE FAILED');
  }

  // =========================
  // DELETE SINGLE
  // =========================
  async del(key: string, query?: Record<string, any>) {
    const fullKey = this.buildKey(key, query);

    await this.cache.del(fullKey);
  }

  // =========================
  // DELETE BY PATTERN
  // =========================
  async deleteByPattern(pattern: string) {
    const keys = await this.redis.keys(`${pattern}*`);

    if (!keys.length) return;

    await this.redis.del(keys);
  }

  // =========================
  // RESET ALL
  // =========================
  async reset() {
    await this.redis.flushAll();
  }
}
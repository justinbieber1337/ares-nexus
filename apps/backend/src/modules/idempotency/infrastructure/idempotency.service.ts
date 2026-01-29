import { Injectable } from '@nestjs/common';
import { RedisClient } from '../../matching-engine/infrastructure/redis/redis.types';

export interface IdempotencyRequest<T> {
  scope: string;
  key: string;
  requestHash: string;
  ttlSeconds?: number;
  lockTtlSeconds?: number;
  handler: () => Promise<T>;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisClient) {}

  /**
   * Ensure that side-effecting operations are processed exactly once.
   * Uses a lock key to prevent concurrent execution and stores the result
   * for a bounded time window to deduplicate retries.
   */
  async execute<T>(request: IdempotencyRequest<T>): Promise<T> {
    const ttlSeconds = request.ttlSeconds ?? 60 * 60 * 24;
    const lockTtlSeconds = request.lockTtlSeconds ?? 30;

    const resultKey = this.resultKey(request.scope, request.key);
    const lockKey = this.lockKey(request.scope, request.key);

    const cached = await this.redis.get(resultKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    const lockAcquired = await this.redis.setnx(lockKey, request.requestHash);
    if (lockAcquired !== 1) {
      const existing = await this.redis.get(resultKey);
      if (existing) {
        return JSON.parse(existing) as T;
      }
      throw new Error('Idempotency key is locked by another request');
    }

    await this.redis.expire(lockKey, lockTtlSeconds);

    try {
      const result = await request.handler();
      await this.redis.set(resultKey, JSON.stringify(result));
      await this.redis.expire(resultKey, ttlSeconds);
      return result;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private resultKey(scope: string, key: string) {
    return `idemp:result:${scope}:${key}`;
  }

  private lockKey(scope: string, key: string) {
    return `idemp:lock:${scope}:${key}`;
  }
}

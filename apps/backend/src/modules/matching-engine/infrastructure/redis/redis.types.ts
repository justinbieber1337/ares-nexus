export interface RedisClient {
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, member: string): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  hset(key: string, data: Record<string, string | number>): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<'OK' | null>;
  setnx(key: string, value: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<number>;
}

import IORedis from 'ioredis';
import { env } from './env';

export function createRedisConnection(): IORedis {
  return new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

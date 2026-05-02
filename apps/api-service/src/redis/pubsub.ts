import Redis from 'ioredis';
import { env } from '../config/env';

export const redisPublisher = new Redis(env.redisUrl);

redisPublisher.on('error', (err) => {
  console.error('[redis] publisher error:', err);
});

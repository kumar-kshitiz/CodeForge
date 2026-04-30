function get(key: string, fallback?: string): string {
  const val = process.env[key];
  if (!val && fallback === undefined) throw new Error(`Missing env var: ${key}`);
  return val ?? (fallback as string);
}

export const env = {
  redisUrl: get('REDIS_URL', 'redis://localhost:6379'),
  apiServiceUrl: get('API_SERVICE_URL', 'http://localhost:3001'),
  workerConcurrency: Number(get('WORKER_CONCURRENCY', '4')),
} as const;

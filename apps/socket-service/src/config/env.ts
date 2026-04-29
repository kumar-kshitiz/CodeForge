function get(key: string, fallback?: string): string {
  const val = process.env[key];
  if (!val && fallback === undefined) throw new Error(`Missing env var: ${key}`);
  return val ?? (fallback as string);
}

export const env = {
  port: Number(get('PORT', '3002')),
  redisUrl: get('REDIS_URL', 'redis://localhost:6379'),
  frontendUrl: get('FRONTEND_URL', 'http://localhost:3000'),
  apiServiceUrl: get('API_SERVICE_URL', 'http://localhost:3001'),
  jwtAccessSecret: get('JWT_ACCESS_SECRET', 'dev_access_secret'),
} as const;

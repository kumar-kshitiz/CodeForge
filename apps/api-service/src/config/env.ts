function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3001,
  databaseUrl: requireEnv('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  openaiApiKey: process.env.OPENAI_API_KEY,
  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
} as const;

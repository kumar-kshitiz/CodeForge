import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { env } from './config/env';
import { prisma } from './prisma/client';

const server = http.createServer(app);

async function start(): Promise<void> {
  await prisma.$connect();
  console.log('[api-service] database connected');

  server.listen(env.port, () => {
    console.log(`[api-service] listening on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error('[api-service] failed to start:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[api-service] shut down');
  });
});

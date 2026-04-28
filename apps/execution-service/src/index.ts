import dotenv from 'dotenv';
import { startWorker } from './worker';

dotenv.config();

console.log('[execution-service] starting worker...');

startWorker().catch((err) => {
  console.error('[execution-service] fatal worker error:', err);
  process.exit(1);
});

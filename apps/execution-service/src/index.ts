import dotenv from 'dotenv';
dotenv.config();

import { createSubmissionWorker } from './workers/submission.worker';
import { env } from './config/env';

console.log('[execution-service] starting...');
console.log(`[execution-service] api-service url: ${env.apiServiceUrl}`);
console.log(`[execution-service] concurrency: ${env.workerConcurrency}`);

const worker = createSubmissionWorker();

console.log('[execution-service] worker listening on queue: code-execution');

process.on('unhandledRejection', (reason) => {
  console.error('[execution-service] unhandled rejection:', reason);
});

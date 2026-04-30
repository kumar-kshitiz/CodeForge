import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { QUEUE_NAME } from '../queue/queue.names';
import { markProcessing, markCompleted, markFailed } from '../services/submission.service';
import type { QueueJobPayload } from '@codeforge/shared-types';

import { executeCodeInSandbox } from '../sandbox/container.manager';

async function processJob(job: Job<QueueJobPayload>): Promise<void> {
  const { submissionId, language, sourceCode } = job.data;

  console.log(`[worker] job ${job.id} | lang=${language} | submission=${submissionId}`);

  await markProcessing(submissionId);

  const result = await executeCodeInSandbox({
    submissionId,
    code: sourceCode,
    language,
  });

  await markCompleted(submissionId, result);

  console.log(`[worker] job ${job.id} completed for submission ${submissionId}`);
}

export function createSubmissionWorker(): Worker<QueueJobPayload> {
  const connection = createRedisConnection();

  const worker = new Worker<QueueJobPayload>(QUEUE_NAME, processJob, {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 4),
  });

  worker.on('completed', (job) => {
    console.log(`[worker] ✓ job ${job.id} done`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[worker] ✗ job ${job?.id} failed: ${err.message}`);
    if (job?.data.submissionId) {
      await markFailed(job.data.submissionId, err.message).catch(() => null);
    }
  });

  process.on('SIGTERM', async () => {
    console.log('[worker] shutting down...');
    await worker.close();
    connection.disconnect();
    console.log('[worker] shutdown complete');
  });

  return worker;
}

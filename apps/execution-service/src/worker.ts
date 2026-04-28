import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ExecutionJob } from '@codeforge/shared-types';

const QUEUE_NAME = 'code-execution';

function getRedisConnection(): IORedis {
  return new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
}

async function processJob(job: Job<ExecutionJob>): Promise<void> {
  const { language, code, stdin } = job.data;

  console.log(`[worker] processing job ${job.id} | lang=${language}`);

  const result = {
    stdout: `[stub] received ${code.length} chars of ${language} code`,
    stderr: '',
    exitCode: 0,
    executionTimeMs: 0,
    memoryUsedKb: 0,
    stdin,
  };

  await job.updateData({ ...job.data, result });
  console.log(`[worker] job ${job.id} completed`);
}

export async function startWorker(): Promise<void> {
  const connection = getRedisConnection();

  const worker = new Worker<ExecutionJob>(QUEUE_NAME, processJob, {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 4),
  });

  worker.on('completed', (job) => console.log(`[worker] job ${job.id} done`));
  worker.on('failed', (job, err) => console.error(`[worker] job ${job?.id} failed:`, err.message));

  process.on('SIGTERM', async () => {
    await worker.close();
    connection.disconnect();
    console.log('[execution-service] graceful shutdown');
  });
}

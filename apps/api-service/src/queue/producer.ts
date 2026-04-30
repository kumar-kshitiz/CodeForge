import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import type { QueueJobPayload } from '@codeforge/shared-types';

export const QUEUE_NAME = 'code-execution';

const connection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

const queue = new Queue<QueueJobPayload>(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function enqueueSubmission(payload: QueueJobPayload): Promise<string> {
  const job = await queue.add('execute', payload, {
    jobId: payload.submissionId,
  });
  return job.id ?? payload.submissionId;
}

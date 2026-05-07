import fetch from 'node-fetch';
import { env } from '../config/env';
import type { SubmissionResult } from '@codeforge/shared-types';

const INTERNAL_HEADERS = {
  'Content-Type': 'application/json',
  'x-internal-key': 'execution-service',
};

export async function markProcessing(submissionId: string): Promise<void> {
  await patchStatus(submissionId, { status: 'PROCESSING' });
}

export async function markCompleted(submissionId: string, result: SubmissionResult): Promise<void> {
  await patchStatus(submissionId, {
    status: 'COMPLETED',
    verdict: result.verdict,
    stdout: result.stdout,
    stderr: result.stderr,
    executionTimeMs: result.executionTimeMs,
    memory: result.memoryUsed,
    passedTestCases: result.passedTestCases,
    totalTestCases: result.totalTestCases,
    failedTestCase: result.failedTestCase,
  });
}

export async function markFailed(submissionId: string, reason: string): Promise<void> {
  await patchStatus(submissionId, {
    status: 'FAILED',
    verdict: 'error',
    stderr: reason,
  });
}

async function patchStatus(submissionId: string, body: Record<string, unknown>): Promise<void> {
  const url = `${env.apiServiceUrl}/api/submissions/${submissionId}/status`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: INTERNAL_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update status for ${submissionId}: ${res.status} ${text}`);
  }
}

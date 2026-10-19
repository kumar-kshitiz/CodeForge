import fetch from "node-fetch";
import { env } from "../config/env";

const INTERNAL_HEADERS = {
  "Content-Type": "application/json",
  "x-internal-key": env.internalServiceKey,
};

export async function markProcessing(submissionId: string): Promise<void> {
  await patchStatus(submissionId, { status: "PROCESSING" });
}

import type { RunnerResult } from "../runners/runner.interface";

export async function markCompleted(
  submissionId: string,
  result: RunnerResult,
): Promise<void> {
  await patchStatus(submissionId, {
    status: "COMPLETED",
    verdict: result.verdict,
    stdout: result.stdout,
    stderr: result.stderr,
    runtimeMs: result.runtimeMs,
    memoryKb: result.memoryKb,
    passedTestCases: result.passedTestCases,
    totalTestCases: result.totalTestCases,
    failedTestCase: result.failedTestCase,
    runtimeIntelligence: result.runtimeIntelligence,
    testResults: result.testResults,
  });
}

export async function markFailed(
  submissionId: string,
  reason: string,
): Promise<void> {
  await patchStatus(submissionId, {
    status: "FAILED",
    verdict: "error",
    stderr: reason,
  });
}

async function patchStatus(
  submissionId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const url = `${env.apiServiceUrl}/api/submissions/${submissionId}/status`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: INTERNAL_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to update status for ${submissionId}: ${res.status} ${text}`,
    );
  }
}

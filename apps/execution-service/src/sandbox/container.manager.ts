import type { SubmissionResult, TestCasePayload } from '@codeforge/shared-types';
import { RunnerFactory } from '../runners/runner.factory';

export interface ExecuteOptions {
  submissionId: string;
  code: string;
  language: string;
  problemSlug?: string;
  testCases?: TestCasePayload[];
}

export async function executeCodeInSandbox(options: ExecuteOptions): Promise<SubmissionResult> {
  const { submissionId, code, language, problemSlug, testCases } = options;

  try {
    const runner = RunnerFactory.getRunner(language);
    
    // The runner (via BaseRunner) handles workspace creation, timeout, and cleanup
    const result = await runner.execute({
      submissionId,
      code,
      problemSlug,
      testCases
    });

    return result as SubmissionResult;
  } catch (err: any) {
    return {
      verdict: 'runtime_error',
      stdout: '',
      stderr: `Internal Execution Error: ${err.message}`,
      executionTimeMs: 0,
    };
  }
}

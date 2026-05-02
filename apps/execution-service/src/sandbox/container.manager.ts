import type { SubmissionResult } from '@codeforge/shared-types';
import { RunnerFactory } from '../runners/runner.factory';

export interface ExecuteOptions {
  submissionId: string;
  code: string;
  language: string;
}

export async function executeCodeInSandbox(options: ExecuteOptions): Promise<SubmissionResult> {
  const { submissionId, code, language } = options;

  try {
    const runner = RunnerFactory.getRunner(language);
    
    // The runner (via BaseRunner) handles workspace creation, timeout, and cleanup
    const result = await runner.execute({
      submissionId,
      code
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

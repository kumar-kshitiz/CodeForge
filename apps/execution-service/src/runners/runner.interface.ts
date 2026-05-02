import type { SubmissionStatus } from '@codeforge/shared-types';

export interface RunnerResult {
  verdict: string;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
}

export interface RunnerOptions {
  submissionId: string;
  code: string;
}

export interface LanguageRunner {
  /**
   * File extension for the source code file (e.g., 'js', 'py', 'cpp')
   */
  readonly extension: string;

  /**
   * Executes the code using the appropriate Docker image and commands.
   * Handles both compilation (if necessary) and execution.
   */
  execute(options: RunnerOptions): Promise<RunnerResult>;
}

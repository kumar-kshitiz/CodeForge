import type { SubmissionStatus } from '@codeforge/shared-types';

import type { SubmissionResult, TestCasePayload } from '@codeforge/shared-types';

export interface RunnerResult extends Omit<SubmissionResult, 'submissionId'> {}

export interface RunnerOptions {
  submissionId: string;
  code: string;
  problemSlug?: string;
  testCases?: TestCasePayload[];
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

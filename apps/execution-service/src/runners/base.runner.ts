import { runDockerContainer, killDockerContainer } from '../docker/docker.util';
import { SANDBOX_CONFIG } from '../config/sandbox.config';
import { createWorkspace, cleanupWorkspace } from '../sandbox/workspace.util';
import type { LanguageRunner, RunnerOptions, RunnerResult } from './runner.interface';
import { DriverInjector } from './drivers/driver.injector';

export abstract class BaseRunner implements LanguageRunner {
  abstract readonly extension: string;
  abstract readonly image: string;

  /**
   * Defines how to execute the code.
   * By default, it runs a single container. Compiling languages can override this.
   */
  protected async runSteps(workspaceDir: string, containerName: string): Promise<RunnerResult> {
    const startTime = Date.now();

    const dockerPromise = runDockerContainer({
      image: this.image,
      containerName,
      memory: SANDBOX_CONFIG.MEMORY_LIMIT,
      cpus: SANDBOX_CONFIG.CPUS,
      volumes: [`${workspaceDir}:/workspace:ro`],
      command: this.getExecutionCommand(),
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), SANDBOX_CONFIG.TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([dockerPromise, timeoutPromise]);
      const executionTimeMs = Date.now() - startTime;

      return {
        verdict: 'accepted',
        stdout: result.stdout,
        stderr: result.stderr,
        executionTimeMs,
      };
    } catch (err: any) {
      if (err.message === 'TIMEOUT') {
        await killDockerContainer(containerName);
        return {
          verdict: 'time_limit_exceeded',
          stdout: '',
          stderr: `Execution exceeded ${SANDBOX_CONFIG.TIMEOUT_MS}ms.`,
          executionTimeMs: SANDBOX_CONFIG.TIMEOUT_MS,
        };
      }

      return {
        verdict: 'runtime_error',
        stdout: err.stdout || '',
        stderr: err.stderr || err.message,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  protected abstract getExecutionCommand(): string;

  protected preprocessCode(code: string, problemSlug?: string): string {
    const lang = this.extension === 'py' ? 'python' : this.extension === 'js' ? 'javascript' : 'cpp';
    return DriverInjector.inject(code, lang, problemSlug);
  }

  protected async compile(workspaceDir: string, submissionId: string): Promise<RunnerResult | null> {
    // Default implementation: interpreted languages don't need compilation
    return null;
  }

  async execute(options: RunnerOptions): Promise<RunnerResult> {
    const { submissionId, code, problemSlug, testCases } = options;
    let workspace;

    const finalCode = this.preprocessCode(code, problemSlug);

    try {
      workspace = await createWorkspace(finalCode, this.extension);
      
      const compileResult = await this.compile(workspace.dirPath, submissionId);
      if (compileResult && compileResult.verdict !== 'accepted') {
        return compileResult;
      }
      
      if (!testCases || testCases.length === 0) {
        // Fallback for no test cases
        const containerName = `codeforge-exec-${submissionId}`;
        const result = await this.runSteps(workspace.dirPath, containerName);
        return {
          verdict: result.verdict,
          stdout: result.stdout,
          stderr: result.stderr,
          executionTimeMs: result.executionTimeMs,
          passedTestCases: 0,
          totalTestCases: 0
        };
      }

      let passed = 0;
      let totalRuntime = 0;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const containerName = `codeforge-exec-${submissionId}-${i}`;
        
        // Write input to workspace
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(workspace.dirPath, 'input.txt'), tc.input || '');

        const result = await this.runSteps(workspace.dirPath, containerName);
        totalRuntime += result.executionTimeMs;

        if (result.verdict !== 'accepted') {
          return {
            verdict: result.verdict,
            stdout: result.stdout,
            stderr: result.stderr,
            executionTimeMs: totalRuntime,
            passedTestCases: passed,
            totalTestCases: testCases.length,
            failedTestCase: {
              input: tc.input,
              expected: tc.expectedOutput,
              actual: result.stdout || result.stderr
            }
          };
        }

        // Normalize outputs for comparison (Token-based matching)
        const normalize = (s: string) => (s || '').trim().split(/\s+/).join(' ');
        const actualOut = normalize(result.stdout);
        const expectedOut = normalize(tc.expectedOutput);

        if (actualOut !== expectedOut) {
          return {
            verdict: 'wrong_answer',
            stdout: result.stdout,
            stderr: result.stderr,
            executionTimeMs: totalRuntime,
            passedTestCases: passed,
            totalTestCases: testCases.length,
            failedTestCase: {
              input: tc.input,
              expected: expectedOut,
              actual: actualOut
            }
          };
        }

        passed++;
      }

      return {
        verdict: 'accepted',
        stdout: '',
        stderr: '',
        executionTimeMs: totalRuntime,
        passedTestCases: passed,
        totalTestCases: testCases.length
      };

    } finally {
      if (workspace) {
        await cleanupWorkspace(workspace.dirPath);
      }
    }
  }
}

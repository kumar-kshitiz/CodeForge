import { runDockerContainer, killDockerContainer } from '../docker/docker.util';
import { SANDBOX_CONFIG } from '../config/sandbox.config';
import { createWorkspace, cleanupWorkspace } from '../sandbox/workspace.util';
import type { LanguageRunner, RunnerOptions, RunnerResult } from './runner.interface';

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

  async execute(options: RunnerOptions): Promise<RunnerResult> {
    const { submissionId, code } = options;
    const containerName = `codeforge-exec-${submissionId}`;
    let workspace;

    try {
      workspace = await createWorkspace(code, this.extension);
      return await this.runSteps(workspace.dirPath, containerName);
    } finally {
      if (workspace) {
        await cleanupWorkspace(workspace.dirPath);
      }
    }
  }
}

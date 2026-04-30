import { SANDBOX_CONFIG } from '../config/sandbox.config';
import { runDockerContainer, killDockerContainer } from '../docker/docker.util';
import { createWorkspace, cleanupWorkspace } from './workspace.util';
import type { SubmissionResult } from '@codeforge/shared-types';

export interface ExecuteOptions {
  submissionId: string;
  code: string;
  language: string;
}

export async function executeCodeInSandbox(options: ExecuteOptions): Promise<SubmissionResult> {
  const { submissionId, code, language } = options;
  let workspace;
  const containerName = `codeforge-exec-${submissionId}`;

  // Use a map for extension resolution based on language (for foundational phase)
  const extMap: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
  };
  const ext = extMap[language] || 'txt';

  try {
    workspace = await createWorkspace(code, ext);

    const startTime = Date.now();

    // A promise that runs the docker container
    const dockerPromise = runDockerContainer({
      image: SANDBOX_CONFIG.BASE_IMAGE,
      containerName,
      memory: SANDBOX_CONFIG.MEMORY_LIMIT,
      cpus: SANDBOX_CONFIG.CPUS,
      volumes: [`${workspace.dirPath}:/workspace:ro`],
      // For this foundation phase, just use `cat` or `node` if javascript.
      // E.g., if language is javascript, we could do: node /workspace/source.js
      // But for a generic foundation test that doesn't need specific runners yet:
      command: `cat /workspace/source.${ext}`,
    });

    // A promise that rejects after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), SANDBOX_CONFIG.TIMEOUT_MS);
    });

    // Race the execution against the timeout
    const result: any = await Promise.race([dockerPromise, timeoutPromise]);
    
    const executionTimeMs = Date.now() - startTime;

    return {
      verdict: 'accepted',
      stdout: result.stdout,
      stderr: result.stderr,
      executionTimeMs,
    };

  } catch (err: any) {
    if (err.message === 'TIMEOUT') {
      // Force kill the container
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
      executionTimeMs: 0,
    };
  } finally {
    if (workspace) {
      await cleanupWorkspace(workspace.dirPath);
    }
  }
}

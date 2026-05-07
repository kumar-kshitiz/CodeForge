import { BaseRunner } from './base.runner';
import { runDockerContainer, killDockerContainer } from '../docker/docker.util';
import { SANDBOX_CONFIG } from '../config/sandbox.config';
import type { RunnerResult } from './runner.interface';

export class CppRunner extends BaseRunner {
  readonly extension = 'cpp';
  readonly image = 'gcc:latest';

  protected getExecutionCommand(): string {
    return `sh -c "/workspace/a.out < /workspace/input.txt"`;
  }

  protected preprocessCode(code: string, problemSlug?: string): string {
    let finalCode = super.preprocessCode(code, problemSlug);
    
    // Fallback: if DriverInjector didn't inject a main and user didn't write one, inject dummy
    if (!/\bmain\s*\(/.test(finalCode)) {
      finalCode += '\n\n// Auto-generated main to allow compilation\nint main() {\n    return 0;\n}\n';
    }
    return finalCode;
  }

  protected async compile(workspaceDir: string, submissionId: string): Promise<RunnerResult | null> {
    const startTime = Date.now();
    try {
      await runDockerContainer({
        image: this.image,
        containerName: `codeforge-exec-${submissionId}-compile`,
        memory: SANDBOX_CONFIG.MEMORY_LIMIT,
        cpus: SANDBOX_CONFIG.CPUS,
        volumes: [`${workspaceDir}:/workspace:rw`],
        command: `g++ /workspace/source.cpp -o /workspace/a.out`,
      });
      return {
        verdict: 'accepted',
        stdout: '',
        stderr: '',
        executionTimeMs: Date.now() - startTime
      };
    } catch (compileErr: any) {
      return {
        verdict: 'compilation_error',
        stdout: compileErr.stdout || '',
        stderr: compileErr.stderr || compileErr.message,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }
}

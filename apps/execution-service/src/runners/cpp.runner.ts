import { BaseRunner } from './base.runner';

export class CppRunner extends BaseRunner {
  readonly extension = 'cpp';
  readonly image = 'gcc:latest';

  protected getExecutionCommand(): string {
    // Compile to /tmp inside the container to keep /workspace read-only.
    // If compilation fails, the container exits with an error and stderr contains the compiler output.
    return `sh -c "g++ /workspace/source.${this.extension} -o /tmp/a.out && /tmp/a.out"`;
  }
}

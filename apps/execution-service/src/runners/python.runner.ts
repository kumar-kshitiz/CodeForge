import { BaseRunner } from './base.runner';

export class PythonRunner extends BaseRunner {
  readonly extension = 'py';
  readonly image = 'python:3.9-alpine';

  protected getExecutionCommand(): string {
    return `sh -c "python3 /workspace/source.${this.extension} < /workspace/input.txt"`;
  }
}

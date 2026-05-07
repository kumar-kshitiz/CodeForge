import { BaseRunner } from './base.runner';

export class JavascriptRunner extends BaseRunner {
  readonly extension = 'js';
  readonly image = 'node:18-alpine';

  protected getExecutionCommand(): string {
    return `sh -c "node /workspace/source.${this.extension} < /workspace/input.txt"`;
  }
}

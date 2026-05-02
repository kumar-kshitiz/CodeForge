import type { LanguageRunner } from './runner.interface';
import { JavascriptRunner } from './javascript.runner';
import { PythonRunner } from './python.runner';
import { CppRunner } from './cpp.runner';
import type { SupportedLanguage } from '@codeforge/shared-types';

export class RunnerFactory {
  private static runners: Record<string, LanguageRunner> = {
    javascript: new JavascriptRunner(),
    python: new PythonRunner(),
    cpp: new CppRunner(),
    // Fallback aliases
    typescript: new JavascriptRunner(), // For now, TS is executed as JS or needs a pre-compile step (we can use ts-node in future)
  };

  static getRunner(language: SupportedLanguage | string): LanguageRunner {
    const runner = this.runners[language];
    if (!runner) {
      throw new Error(`Unsupported language: ${language}`);
    }
    return runner;
  }
}

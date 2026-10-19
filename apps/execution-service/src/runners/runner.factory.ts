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
  };

  static getRunner(language: SupportedLanguage | string): LanguageRunner {
    const runner = this.runners[language];
    if (!runner) {
      throw new Error(`Unsupported language: ${language}`);
    }
    return runner;
  }
}

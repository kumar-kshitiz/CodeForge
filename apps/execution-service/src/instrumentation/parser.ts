import { ExecutionTrace } from './types';

export class TraceParser {
  /**
   * Parses stderr to extract injected [TRACE] JSON lines.
   * Cleans paths and shifts line numbers in the cleaned standard error/output to match the user's code editor.
   */
  static parse(stderr: string, stdout: string, lineOffset: number = 0): { traces: ExecutionTrace[]; cleanedStderr: string; cleanedStdout: string } {
    const traces: ExecutionTrace[] = [];
    const stderrLines = stderr ? stderr.split('\n') : [];
    const stdoutLines = stdout ? stdout.split('\n') : [];

    const cleanLine = (line: string): string => {
      // 1. Strip sandbox paths: /workspace/source.cpp -> source.cpp, etc.
      let cleaned = line.replace(/\/workspace\/source\.([a-zA-Z0-9]+)/g, 'source.$1');
      
      // 2. Adjust line numbers. Matches patterns like:
      // "source.cpp:24:9:" or "at /workspace/source.js:20:5"
      if (lineOffset > 0) {
        cleaned = cleaned.replace(/(source\.[a-zA-Z0-9]+:)(\d+)/g, (match, prefix, numStr) => {
          const originalLine = parseInt(numStr, 10);
          const newLine = originalLine - lineOffset;
          // If newLine is <= 0, it means the error is inside our injected trace code or boilerplate
          return `${prefix}${newLine > 0 ? newLine : originalLine}`;
        });
        
        // Also catch GCC context lines like "   24 |  return x;"
        cleaned = cleaned.replace(/^(\s*)(\d+)(\s*\|)/, (match, prefix, numStr, suffix) => {
          const originalLine = parseInt(numStr, 10);
          const newLine = originalLine - lineOffset;
          return `${prefix}${newLine > 0 ? newLine : originalLine}${suffix}`;
        });
      }
      return cleaned;
    };

    const cleanedStderrLines: string[] = [];
    const cleanedStdoutLines: string[] = [];

    // Parse stderr
    for (const line of stderrLines) {
      if (line.startsWith('[TRACE]')) {
        try {
          const jsonStr = line.substring(7); // Remove '[TRACE]'
          const parsed = JSON.parse(jsonStr) as ExecutionTrace;
          traces.push(parsed);
        } catch (err) {
          // If parsing fails, just ignore it, to avoid crashing the runner
        }
      } else {
        cleanedStderrLines.push(cleanLine(line));
      }
    }

    // Parse stdout (sometimes C++ mixes stdout/stderr depending on buffering)
    for (const line of stdoutLines) {
      if (line.startsWith('[TRACE]')) {
        try {
          const jsonStr = line.substring(7);
          const parsed = JSON.parse(jsonStr) as ExecutionTrace;
          traces.push(parsed);
        } catch (err) {
          // ignore
        }
      } else {
        cleanedStdoutLines.push(cleanLine(line));
      }
    }

    // Sort traces by step just in case asynchronous printing mixed them up
    traces.sort((a, b) => a.step - b.step);

    return {
      traces,
      cleanedStderr: cleanedStderrLines.join('\n'),
      cleanedStdout: cleanedStdoutLines.join('\n'),
    };
  }
}

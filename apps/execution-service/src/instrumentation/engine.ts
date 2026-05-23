export class InstrumentationEngine {
  /**
   * Returns the exact number of lines injected at the top of the file.
   * This is crucial for correcting compiler and runtime error line numbers.
   */
  static getInjectionOffset(language: string): number {
    if (language === 'javascript' || language === 'js') return 16;
    if (language === 'cpp' || language === 'c++') return 20;
    return 0; // Python uses DriverInjector which appends at the bottom, so top offset is 0
  }

  /**
   * Injects tracing logic into user code.
   * Uses smart block targeting (loops, function headers) to minimize overhead.
   */
  static instrument(code: string, language: string): string {
    if (language === 'javascript' || language === 'js') {
      return this.instrumentJavaScript(code);
    }
    if (language === 'cpp' || language === 'c++') {
      return this.instrumentCpp(code);
    }
    // Fallback: return original code if language not supported
    return code;
  }

  private static instrumentJavaScript(code: string): string {
    const traceHeader = `
// --- CODEFORGE TRACE ENGINE (JS) ---
const __traceConfig = { step: 0 };
function __trace(event_type, location, variables, operation) {
  if (__traceConfig.step > 20000) return; // Prevent infinite log bloat
  const trace = {
    step: __traceConfig.step++,
    event_type,
    location,
    variables,
    operation,
    timestamp: Date.now()
  };
  console.error('[TRACE]' + JSON.stringify(trace));
}
// -----------------------------------
`;
    // Regex heuristics for injection
    // 1. Trace function start (recursion)
    let injected = code.replace(
      /(function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{)/g,
      `$1\n  __trace('function_enter', '$2', {}, 'call');\n`
    );

    // 2. Trace loop start (for/while)
    injected = injected.replace(
      /(while\s*\([^)]+\)\s*\{|for\s*\([^)]+\)\s*\{)/g,
      `$1\n  __trace('loop_iteration', 'loop', {}, 'iteration');\n`
    );

    return traceHeader + injected;
  }

  private static instrumentCpp(code: string): string {
    const traceHeader = `
// --- CODEFORGE TRACE ENGINE (C++) ---
#include <iostream>
#include <string>
#include <chrono>

static int __trace_step = 0;
void __trace(const std::string& event_type, const std::string& location, const std::string& variables, const std::string& operation) {
    if (__trace_step > 20000) return; // Prevent infinite log bloat
    auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    
    // Manual JSON construction to avoid external dependencies in user code
    std::cerr << "[TRACE]{\\"step\\":" << __trace_step++ 
              << ",\\"event_type\\":\\"" << event_type << "\\""
              << ",\\"location\\":\\"" << location << "\\""
              << ",\\"variables\\":{" << variables << "}"
              << ",\\"operation\\":\\"" << operation << "\\""
              << ",\\"timestamp\\":" << now << "}\\n";
}
// ------------------------------------
`;
    // Basic regex injection (not perfect, but sufficient for heuristic smart targeting)
    // Avoid modifying inside standard library includes
    let body = code;
    
    // 1. Trace function start (recursion) - rough heuristic for C++
    body = body.replace(
      /([a-zA-Z0-9_<>:]+\s+)([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/g,
      `$1$2($3) {\n  __trace("function_enter", "$2", "", "call");\n`
    );

    // 2. Trace loop start
    body = body.replace(
      /(while\s*\([^)]+\)\s*\{|for\s*\([^)]+\)\s*\{)/g,
      `$1\n  __trace("loop_iteration", "loop", "", "iteration");\n`
    );

    return traceHeader + body;
  }
}

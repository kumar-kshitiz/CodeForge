export class CrashInferenceEngine {
  /**
   * Infers the deterministic root cause from exit signals, stderr, and detected anomalies/patterns.
   */
  static infer(
    exitSignal: string | null,
    stderr: string,
    anomalies: string[],
    patterns: string[]
  ): { category: string; rootCause: string; confidence: number; focus: string[] } {
    
    const combinedSignals = [...anomalies, ...patterns].join(' | ').toLowerCase();
    const stderrLower = stderr.toLowerCase();

    // 1. Segmentation Fault (SIGSEGV / 139)
    if (exitSignal === 'SIGSEGV' || stderrLower.includes('segmentation fault')) {
      if (combinedSignals.includes('negative index access') || combinedSignals.includes('large memory index')) {
        return {
          category: 'segmentation_fault',
          rootCause: 'out_of_bounds_array_access',
          confidence: 0.95,
          focus: ['Check array boundary conditions', 'Verify index calculation logic']
        };
      }
      if (stderrLower.includes('null pointer')) {
        return {
          category: 'segmentation_fault',
          rootCause: 'null_pointer_dereference',
          confidence: 0.90,
          focus: ['Ensure pointer is initialized before dereferencing', 'Check for failed allocations']
        };
      }
      return {
        category: 'segmentation_fault',
        rootCause: 'invalid_memory_access',
        confidence: 0.70,
        focus: ['Check pointers and iterators', 'Verify array bounds']
      };
    }

    // 2. Floating Point Exception (SIGFPE / 136)
    if (exitSignal === 'SIGFPE' || stderrLower.includes('floating point exception') || stderrLower.includes('divide by zero')) {
      return {
        category: 'floating_point_exception',
        rootCause: 'divide_by_zero',
        confidence: 0.95,
        focus: ['Check division operations', 'Ensure denominator is not zero']
      };
    }

    // 3. Time Limit Exceeded / Infinite loops
    if (exitSignal === 'TIMEOUT' || stderrLower.includes('execution exceeded')) {
      if (combinedSignals.includes('infinite recursion')) {
        return {
          category: 'timeout',
          rootCause: 'infinite_recursion',
          confidence: 0.95,
          focus: ['Check base cases in recursive functions']
        };
      }
      if (combinedSignals.includes('repeated loop states')) {
        return {
          category: 'timeout',
          rootCause: 'infinite_loop',
          confidence: 0.90,
          focus: ['Check loop termination conditions', 'Verify loop counter incrementation']
        };
      }
      return {
        category: 'timeout',
        rootCause: 'time_limit_exceeded',
        confidence: 0.80,
        focus: ['Optimize algorithm complexity', 'Check for slow operations in loops']
      };
    }

    // 4. Memory Limit Exceeded / Stack Overflow
    if (stderrLower.includes('out of memory') || stderrLower.includes('std::bad_alloc')) {
      return {
        category: 'memory_limit',
        rootCause: 'excessive_memory_allocation',
        confidence: 0.90,
        focus: ['Check size of dynamic allocations', 'Avoid excessive vector resizing']
      };
    }
    if (stderrLower.includes('stack overflow')) {
      return {
        category: 'stack_overflow',
        rootCause: 'infinite_recursion_or_large_stack',
        confidence: 0.90,
        focus: ['Move large arrays to heap', 'Check recursion depth']
      };
    }

    // 5. Unhandled Exceptions
    if (stderrLower.includes('terminate called after throwing an instance of')) {
      if (stderrLower.includes('out_of_range')) {
        return {
          category: 'unhandled_exception',
          rootCause: 'array_out_of_range',
          confidence: 0.95,
          focus: ['Use vector::at() safely', 'Check container boundaries']
        };
      }
      return {
        category: 'unhandled_exception',
        rootCause: 'thrown_exception_not_caught',
        confidence: 0.85,
        focus: ['Add try-catch blocks', 'Check standard library preconditions']
      };
    }

    // Default Fallback
    return {
      category: 'unknown_runtime_error',
      rootCause: 'unidentified_abnormal_termination',
      confidence: 0.40,
      focus: ['Review stderr output carefully', 'Check for silent memory corruption']
    };
  }
}

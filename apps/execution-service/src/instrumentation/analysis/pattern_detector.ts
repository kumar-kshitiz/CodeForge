import { TraceSnapshot } from '../types';

export class PatternDetector {
  /**
   * Detects pattern-based execution anomalies.
   */
  static detectPatterns(snapshot: TraceSnapshot): string[] {
    const suspiciousPatterns: string[] = [];

    // 1. Infinite Recursion
    let hasInfiniteRecursion = false;
    for (const [func, depth] of Object.entries(snapshot.recursion_depth)) {
      if (depth > 1000) {
        suspiciousPatterns.push(`Infinite recursion growth detected in '${func}' (Depth: ${depth})`);
        hasInfiniteRecursion = true;
      }
    }

    // 2. Repeated Loop States (Stalling)
    for (const [loop, iterations] of Object.entries(snapshot.loop_counters)) {
      if (iterations > 15000) {
        suspiciousPatterns.push(`Repeated loop states/stalling detected at '${loop}' (Iterations: ${iterations})`);
      }
    }

    // 3. Invalid memory access patterns (pointer/iterator deref tracking if implemented)
    // Placeholder for future C++ iterator tracking
    
    return suspiciousPatterns;
  }
}

import { ExecutionTrace, SuspiciousPattern, TraceSnapshot } from './types';
import { SnapshotManager } from './snapshot';

export class TraceCollector {
  /**
   * Processes an array of traces and detects suspicious patterns
   */
  static processTraces(traces: ExecutionTrace[]): { snapshot: TraceSnapshot; suspiciousPatterns: SuspiciousPattern[] } {
    const manager = new SnapshotManager();
    const patterns: SuspiciousPattern[] = [];

    for (const trace of traces) {
      manager.addTrace(trace);
    }

    const snapshot = manager.getSnapshot();

    // 1. Detect Infinite Recursion Growth
    for (const [func, depth] of Object.entries(snapshot.recursion_depth)) {
      if (depth > 1000) {
        patterns.push({
          type: 'infinite_recursion',
          description: `Function '${func}' exceeded 1000 stack frames without returning.`,
          severity: 'high',
          location: func,
        });
      }
    }

    // 2. Detect Repeated Loop States (Infinite Loop Heuristic)
    for (const [loop, iterations] of Object.entries(snapshot.loop_counters)) {
      if (iterations > 15000) {
        patterns.push({
          type: 'repeated_loop_states',
          description: `Loop at '${loop}' executed over 15000 times, indicating a potential infinite loop or extremely high complexity.`,
          severity: 'medium',
          location: loop,
        });
      }
    }

    // 3. Detect Out-of-bounds (Basic Heuristic if size was known - placeholder for future)
    for (const [loc, idx] of Object.entries(snapshot.last_indices)) {
      if (typeof idx === 'number' && idx < 0) {
        patterns.push({
          type: 'negative_index',
          description: `Array indexed with a negative value (${idx}).`,
          severity: 'high',
          location: loc,
        });
      }
    }

    return {
      snapshot,
      suspiciousPatterns: patterns,
    };
  }
}

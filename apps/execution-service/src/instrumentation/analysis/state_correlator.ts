import { TraceSnapshot } from '../types';

export class StateCorrelator {
  /**
   * Correlates state to identify specific memory or logic anomalies.
   * e.g., index < 0 or index >= size.
   */
  static correlate(snapshot: TraceSnapshot): { correlatedAnomalies: string[]; finalState: Record<string, any> } {
    const anomalies: string[] = [];
    const finalState: Record<string, any> = {
      last_indices: snapshot.last_indices,
      loop_counters: snapshot.loop_counters,
      recursion_depth: snapshot.recursion_depth,
    };

    // 1. Negative Index Check
    for (const [loc, idx] of Object.entries(snapshot.last_indices)) {
      if (typeof idx === 'number' && idx < 0) {
        anomalies.push(`Negative index access detected at ${loc} (index=${idx})`);
      }
    }

    // Since we don't have AST to extract array sizes reliably, 
    // we assume extremely large indices (e.g. > 10^8) might be uninitialized pointers or massive out of bounds.
    for (const [loc, idx] of Object.entries(snapshot.last_indices)) {
      if (typeof idx === 'number' && idx > 100000000) {
        anomalies.push(`Suspiciously large memory index access at ${loc} (index=${idx})`);
      }
    }

    // Extract the exact variables from the most recent trace
    if (snapshot.recent_traces.length > 0) {
      const lastTrace = snapshot.recent_traces[snapshot.recent_traces.length - 1];
      finalState.last_variables = lastTrace.variables;
      finalState.last_location = lastTrace.location;
    }

    return { correlatedAnomalies: anomalies, finalState };
  }
}

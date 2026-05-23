import { ExecutionTrace, TraceSnapshot } from './types';

export class SnapshotManager {
  private readonly maxTraces = 100;
  private traces: ExecutionTrace[] = [];
  
  private loopCounters: Record<string, number> = {};
  private recursionDepth: Record<string, number> = {};
  private lastIndices: Record<string, any> = {};

  addTrace(trace: ExecutionTrace) {
    // Maintain sliding window
    this.traces.push(trace);
    if (this.traces.length > this.maxTraces) {
      this.traces.shift();
    }

    // Track state
    if (trace.event_type === 'loop_iteration') {
      this.loopCounters[trace.location] = (this.loopCounters[trace.location] || 0) + 1;
    } else if (trace.event_type === 'function_enter') {
      this.recursionDepth[trace.location] = (this.recursionDepth[trace.location] || 0) + 1;
    } else if (trace.event_type === 'array_access') {
      if (trace.variables && trace.variables.index !== undefined) {
        this.lastIndices[trace.location] = trace.variables.index;
      }
    }
  }

  getSnapshot(): TraceSnapshot {
    return {
      recent_traces: [...this.traces],
      loop_counters: { ...this.loopCounters },
      recursion_depth: { ...this.recursionDepth },
      last_indices: { ...this.lastIndices },
    };
  }
}

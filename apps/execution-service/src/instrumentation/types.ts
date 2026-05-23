export interface ExecutionTrace {
  step: number;
  event_type: string;
  location: string;
  variables: Record<string, any>;
  operation: string;
  timestamp: number;
}

export interface TraceSnapshot {
  recent_traces: ExecutionTrace[];
  loop_counters: Record<string, number>;
  recursion_depth: Record<string, number>;
  last_indices: Record<string, any>;
}

export interface SuspiciousPattern {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  location: string;
}

export interface TraceResult {
  snapshot: TraceSnapshot;
  suspicious_patterns: SuspiciousPattern[];
  cleaned_stderr: string;
  cleaned_stdout: string;
}

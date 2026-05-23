import { TraceSnapshot } from '../types';
import { RuntimeIntelligence } from './types';
import { StateCorrelator } from './state_correlator';
import { PatternDetector } from './pattern_detector';
import { CrashInferenceEngine } from './crash_inference';

export class RuntimeAnalyzer {
  /**
   * Generates deterministic runtime intelligence from traces and crash metadata.
   */
  static analyze(
    snapshot: TraceSnapshot,
    stderr: string,
    exitSignal: string | null
  ): RuntimeIntelligence {
    
    // 1. State Correlation
    const { correlatedAnomalies, finalState } = StateCorrelator.correlate(snapshot);

    // 2. Suspicious Pattern Detection
    const detectedPatterns = PatternDetector.detectPatterns(snapshot);

    // 3. Crash Inference
    const inference = CrashInferenceEngine.infer(
      exitSignal,
      stderr,
      correlatedAnomalies,
      detectedPatterns
    );

    // 4. Synthesize Intelligence Payload
    return {
      runtime_category: inference.category,
      likely_root_cause: inference.rootCause,
      confidence: inference.confidence,
      suspicious_operations: [...correlatedAnomalies, ...detectedPatterns],
      failure_state: finalState,
      recommended_analysis_focus: inference.focus,
    };
  }
}

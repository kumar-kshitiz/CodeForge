export interface RuntimeIntelligence {
  runtime_category: string;
  likely_root_cause: string;
  confidence: number;
  suspicious_operations: string[];
  failure_state: Record<string, any>;
  recommended_analysis_focus: string[];
}

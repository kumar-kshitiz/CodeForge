'use client';

import { useState } from 'react';

// ─── Generic Feedback Types (Accepted submissions) ───────────────────────────
interface AiFeedback {
  id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  optimizations: string[];
  complexityEstimate: string;
  readabilityScore: number;
}

// ─── Error Feedback Types (per agent) ────────────────────────────────────────
interface CompileErrorFeedback {
  error_type: 'compile_error';
  language: string;
  root_cause: string;
  simple_explanation: string;
  problematic_code: string;
  minimal_fix: string;
  compiler_message_summary: string;
  confidence: number;
}

interface RuntimeErrorFeedback {
  error_type: 'runtime_error';
  root_cause: string;
  simple_explanation: string;
  crash_trigger: string;
  problematic_pattern: string;
  minimal_fix_direction: string;
  prevention_tip: string;
  confidence: number;
}

interface LogicErrorFeedback {
  error_type: 'wrong_answer';
  language: string;
  mismatch_analysis: string;
  root_cause: string;
  simple_explanation: string;
  problematic_logic: string;
  suggested_fix: string;
  edge_cases_to_check: string[];
  confidence: number;
}

interface ComplexityErrorFeedback {
  error_type: 'time_limit_exceeded';
  language: string;
  estimated_complexity: string;
  bottleneck: string;
  root_cause: string;
  simple_explanation: string;
  slow_code_snippet: string;
  optimization_approach: string;
  target_complexity: string;
  confidence: number;
}

interface MemoryErrorFeedback {
  error_type: 'memory_limit_exceeded';
  language: string;
  estimated_space_complexity: string;
  memory_hog: string;
  root_cause: string;
  simple_explanation: string;
  problematic_allocation: string;
  optimization_approach: string;
  target_space_complexity: string;
  confidence: number;
}

interface LoopErrorFeedback {
  error_type: 'infinite_loop';
  language: string;
  loop_type: string;
  root_cause: string;
  simple_explanation: string;
  problematic_loop: string;
  termination_condition_issue: string;
  minimal_fix: string;
  confidence: number;
}

type ErrorFeedbackPayload =
  | CompileErrorFeedback
  | RuntimeErrorFeedback
  | LogicErrorFeedback
  | ComplexityErrorFeedback
  | MemoryErrorFeedback
  | LoopErrorFeedback;

// ─── Error Verdict Classification ────────────────────────────────────────────
const ERROR_VERDICTS = new Set([
  'compilation_error',
  'runtime_error',
  'wrong_answer',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'infinite_loop',
]);

const AGENT_META: Record<string, { icon: string; label: string; color: string }> = {
  compile_error:         { icon: '🔨', label: 'Compile Error Analysis',    color: '#f59e0b' },
  runtime_error:         { icon: '💥', label: 'Runtime Error Analysis',    color: '#ef4444' },
  wrong_answer:          { icon: '❌', label: 'Logic Error Analysis',       color: '#8b5cf6' },
  time_limit_exceeded:   { icon: '⏱️', label: 'Complexity Analysis',        color: '#06b6d4' },
  memory_limit_exceeded: { icon: '🧠', label: 'Memory Analysis',            color: '#10b981' },
  infinite_loop:         { icon: '🔄', label: 'Loop Detection Analysis',   color: '#f97316' },
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─── Confidence Badge ─────────────────────────────────────────────────────────
function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const label = pct >= 80 ? 'High' : pct >= 50 ? 'Medium' : 'Low';
  return (
    <span className="ai-confidence-badge" style={{ borderColor: color, color }}>
      {label} Confidence ({pct}%)
    </span>
  );
}

// ─── Code Snippet Block ───────────────────────────────────────────────────────
function CodeSnippet({ code, label }: { code: string; label: string }) {
  if (!code || code.startsWith('//')) return null;
  return (
    <div className="ai-code-snippet">
      <div className="ai-snippet-label">{label}</div>
      <pre className="ai-snippet-code">{code}</pre>
    </div>
  );
}

// ─── Error Feedback Renderers ─────────────────────────────────────────────────
function CompileErrorView({ data }: { data: CompileErrorFeedback }) {
  return (
    <>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Root Cause</div>
        <div className="ai-error-field-value">{data.root_cause}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Explanation</div>
        <div className="ai-error-field-value">{data.simple_explanation}</div>
      </div>
      <CodeSnippet code={data.problematic_code} label="Problematic Code" />
      <div className="ai-error-row">
        <div className="ai-error-field-label">Minimal Fix</div>
        <div className="ai-error-field-value ai-fix-text">{data.minimal_fix}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Compiler Message</div>
        <div className="ai-error-field-value ai-muted">{data.compiler_message_summary}</div>
      </div>
      <ConfidenceBadge value={data.confidence} />
    </>
  );
}

function RuntimeErrorView({ data }: { data: RuntimeErrorFeedback }) {
  return (
    <>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Root Cause</div>
        <div className="ai-error-field-value">{data.root_cause}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Explanation</div>
        <div className="ai-error-field-value">{data.simple_explanation}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Crash Trigger</div>
        <div className="ai-error-field-value">{data.crash_trigger}</div>
      </div>
      {data.problematic_pattern && (
        <div className="ai-error-row">
          <div className="ai-error-field-label">Suspicious Pattern</div>
          <div className="ai-error-field-value">{data.problematic_pattern}</div>
        </div>
      )}
      <div className="ai-error-row">
        <div className="ai-error-field-label">Minimal Fix</div>
        <div className="ai-error-field-value ai-fix-text">{data.minimal_fix_direction}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Prevention Tip</div>
        <div className="ai-error-field-value ai-muted">{data.prevention_tip}</div>
      </div>
      <ConfidenceBadge value={data.confidence} />
    </>
  );
}

function LogicErrorView({ data }: { data: LogicErrorFeedback }) {
  return (
    <>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Output Mismatch</div>
        <div className="ai-error-field-value">{data.mismatch_analysis}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Root Cause</div>
        <div className="ai-error-field-value">{data.root_cause}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Explanation</div>
        <div className="ai-error-field-value">{data.simple_explanation}</div>
      </div>
      <CodeSnippet code={data.problematic_logic} label="Problematic Logic" />
      <div className="ai-error-row">
        <div className="ai-error-field-label">Suggested Fix</div>
        <div className="ai-error-field-value ai-fix-text">{data.suggested_fix}</div>
      </div>
      {data.edge_cases_to_check.length > 0 && (
        <div className="ai-error-row">
          <div className="ai-error-field-label">Edge Cases to Check</div>
          <ul className="ai-edge-case-list">
            {data.edge_cases_to_check.map((ec, i) => <li key={i}>{ec}</li>)}
          </ul>
        </div>
      )}
      <ConfidenceBadge value={data.confidence} />
    </>
  );
}

function ComplexityErrorView({ data }: { data: ComplexityErrorFeedback }) {
  return (
    <>
      <div className="ai-complexity-chips">
        <div className="ai-chip ai-chip-red">Current: {data.estimated_complexity}</div>
        <div className="ai-chip ai-chip-green">Target: {data.target_complexity}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Bottleneck</div>
        <div className="ai-error-field-value">{data.bottleneck}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Root Cause</div>
        <div className="ai-error-field-value">{data.root_cause}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Explanation</div>
        <div className="ai-error-field-value">{data.simple_explanation}</div>
      </div>
      <CodeSnippet code={data.slow_code_snippet} label="Slow Code" />
      <div className="ai-error-row">
        <div className="ai-error-field-label">Optimization Approach</div>
        <div className="ai-error-field-value ai-fix-text">{data.optimization_approach}</div>
      </div>
      <ConfidenceBadge value={data.confidence} />
    </>
  );
}

function MemoryErrorView({ data }: { data: MemoryErrorFeedback }) {
  return (
    <>
      <div className="ai-complexity-chips">
        <div className="ai-chip ai-chip-red">Current: {data.estimated_space_complexity}</div>
        <div className="ai-chip ai-chip-green">Target: {data.target_space_complexity}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Memory Hog</div>
        <div className="ai-error-field-value">{data.memory_hog}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Root Cause</div>
        <div className="ai-error-field-value">{data.root_cause}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Explanation</div>
        <div className="ai-error-field-value">{data.simple_explanation}</div>
      </div>
      <CodeSnippet code={data.problematic_allocation} label="Excessive Allocation" />
      <div className="ai-error-row">
        <div className="ai-error-field-label">Optimization Approach</div>
        <div className="ai-error-field-value ai-fix-text">{data.optimization_approach}</div>
      </div>
      <ConfidenceBadge value={data.confidence} />
    </>
  );
}

function LoopErrorView({ data }: { data: LoopErrorFeedback }) {
  return (
    <>
      <div className="ai-error-tag">{data.loop_type.replace(/_/g, ' ')}</div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Root Cause</div>
        <div className="ai-error-field-value">{data.root_cause}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Explanation</div>
        <div className="ai-error-field-value">{data.simple_explanation}</div>
      </div>
      <CodeSnippet code={data.problematic_loop} label="Problematic Loop" />
      <div className="ai-error-row">
        <div className="ai-error-field-label">Termination Issue</div>
        <div className="ai-error-field-value">{data.termination_condition_issue}</div>
      </div>
      <div className="ai-error-row">
        <div className="ai-error-field-label">Minimal Fix</div>
        <div className="ai-error-field-value ai-fix-text">{data.minimal_fix}</div>
      </div>
      <ConfidenceBadge value={data.confidence} />
    </>
  );
}

function ErrorFeedbackBody({ feedback }: { feedback: ErrorFeedbackPayload }) {
  switch (feedback.error_type) {
    case 'compile_error':         return <CompileErrorView data={feedback} />;
    case 'runtime_error':         return <RuntimeErrorView data={feedback} />;
    case 'wrong_answer':          return <LogicErrorView data={feedback} />;
    case 'time_limit_exceeded':   return <ComplexityErrorView data={feedback} />;
    case 'memory_limit_exceeded': return <MemoryErrorView data={feedback} />;
    case 'infinite_loop':         return <LoopErrorView data={feedback} />;
  }
}

// ─── Generic Feedback View (Accepted) ────────────────────────────────────────
function GenericFeedbackView({ feedback }: { feedback: AiFeedback }) {
  return (
    <div className="ai-feedback-container">
      <div className="ai-header">
        <h3>✨ AI Code Review</h3>
      </div>
      <p className="ai-summary">{feedback.summary}</p>
      <div className="ai-metrics">
        <div className="metric-box">
          <span className="metric-label">Complexity</span>
          <span className="metric-value">{feedback.complexityEstimate}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Readability</span>
          <div className="readability-bar">
            <div
              className={`bar-fill ${feedback.readabilityScore >= 80 ? 'good' : feedback.readabilityScore >= 50 ? 'avg' : 'poor'}`}
              style={{ width: `${feedback.readabilityScore}%` }}
            />
            <span className="bar-text">{feedback.readabilityScore}/100</span>
          </div>
        </div>
      </div>
      <div className="ai-grid">
        {feedback.strengths.length > 0 && (
          <div className="ai-card card-strengths">
            <h4>👍 Strengths</h4>
            <ul>{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        )}
        {feedback.weaknesses.length > 0 && (
          <div className="ai-card card-weaknesses">
            <h4>💡 Needs Improvement</h4>
            <ul>{feedback.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}
        {feedback.optimizations.length > 0 && (
          <div className="ai-card card-optimizations" style={{ gridColumn: '1 / -1' }}>
            <h4>🚀 Optimizations</h4>
            <ul>{feedback.optimizations.map((o, i) => <li key={i}>{o}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function AiFeedbackPanel({
  submissionId,
  verdict,
}: {
  submissionId: string;
  verdict?: string | null;
}) {
  const [genericFeedback, setGenericFeedback] = useState<AiFeedback | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<ErrorFeedbackPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isErrorVerdict = verdict && ERROR_VERDICTS.has(verdict);

  const fetchGenericFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/submissions/${submissionId}/feedback`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to fetch AI feedback');
      }
      const data = await res.json();
      setGenericFeedback(data.feedback);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchErrorFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/submissions/${submissionId}/error-feedback`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to fetch error analysis');
      }
      const data = await res.json();
      // agentResponse is the nested JSON stored in the DB
      const payload = data.feedback?.agentResponse ?? data.feedback;
      setErrorFeedback(payload as ErrorFeedbackPayload);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="ai-feedback-loading">
        <span className="spinner" />
        <p>AI agent is analyzing your code...</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="ai-feedback-error">
        <p className="text-red-500">{error}</p>
        <button
          className="btn-secondary btn-sm"
          onClick={isErrorVerdict ? fetchErrorFeedback : fetchGenericFeedback}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Error Feedback Rendered ──
  if (errorFeedback) {
    const verdictKey = errorFeedback.error_type;
    const meta = AGENT_META[verdictKey] ?? { icon: '🤖', label: 'AI Analysis', color: '#6366f1' };
    return (
      <div className="ai-error-feedback-container">
        <div className="ai-error-header" style={{ borderLeftColor: meta.color }}>
          <span className="ai-error-icon">{meta.icon}</span>
          <div>
            <div className="ai-error-header-title" style={{ color: meta.color }}>{meta.label}</div>
            <div className="ai-error-header-sub">Powered by specialized AI agent</div>
          </div>
        </div>
        <div className="ai-error-body">
          <ErrorFeedbackBody feedback={errorFeedback} />
        </div>
      </div>
    );
  }

  // ── Generic Feedback Rendered ──
  if (genericFeedback) {
    return <GenericFeedbackView feedback={genericFeedback} />;
  }

  // ── CTA ──
  if (isErrorVerdict) {
    const meta = AGENT_META[verdict!] ?? { icon: '🤖', label: 'Analyze Error', color: '#6366f1' };
    return (
      <div className="ai-feedback-cta ai-feedback-cta-error">
        <div className="ai-cta-icon">{meta.icon}</div>
        <p>Want to understand this error?</p>
        <p className="ai-cta-sub">Our specialized <strong>{meta.label.replace(' Analysis', '')} Agent</strong> will pinpoint the root cause and suggest a minimal fix.</p>
        <button
          id="btn-analyze-error"
          className="btn-error-analyze"
          onClick={fetchErrorFeedback}
        >
          🔍 Analyze Error with AI
        </button>
      </div>
    );
  }

  return (
    <div className="ai-feedback-cta">
      <div className="ai-cta-icon">✨</div>
      <p>Want intelligent code review?</p>
      <button
        id="btn-generate-ai-feedback"
        className="btn-primary btn-sm"
        onClick={fetchGenericFeedback}
      >
        Generate AI Feedback
      </button>
    </div>
  );
}

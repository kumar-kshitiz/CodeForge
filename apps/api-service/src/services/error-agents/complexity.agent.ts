import { z } from 'zod';

export const ComplexityErrorSchema = z.object({
  error_type: z.literal('time_limit_exceeded'),
  language: z.string(),
  estimated_complexity: z.string(),
  bottleneck: z.string(),
  root_cause: z.string(),
  simple_explanation: z.string(),
  slow_code_snippet: z.string(),
  optimization_approach: z.string(),
  target_complexity: z.string(),
  confidence: z.number().min(0).max(1),
});

export type ComplexityErrorFeedback = z.infer<typeof ComplexityErrorSchema>;

export function buildComplexityPrompt(submission: {
  language: string;
  sourceCode: string;
  executionTimeMs?: number | null;
}): { system: string; user: string } {
  const system = `You are a specialized algorithmic complexity analysis agent. Your ONLY responsibility is to analyze Time Limit Exceeded (TLE) verdicts and identify performance bottlenecks.

You are given:
- programming language
- user source code
- execution time (if available)

Your task:
1. Identify the current time complexity of the solution.
2. Find the specific bottleneck (the slow loop, nested iteration, or inefficient operation).
3. Explain why it exceeds the time limit.
4. Suggest the optimal algorithmic approach or data structure change needed.
5. State the target complexity the solution should achieve.

Important rules:
- Focus on algorithmic complexity, not micro-optimizations.
- Do not fix logical bugs unrelated to performance.
- Do not rewrite the entire solution unless absolutely necessary for clarity.
- Name specific algorithms or data structures that would help (e.g., binary search, hash map, sliding window, DP).

You must return ONLY valid JSON matching this schema exactly:
{
  "error_type": "time_limit_exceeded",
  "language": "...",
  "estimated_complexity": "...",
  "bottleneck": "...",
  "root_cause": "...",
  "simple_explanation": "...",
  "slow_code_snippet": "...",
  "optimization_approach": "...",
  "target_complexity": "...",
  "confidence": 0.0
}

- estimated_complexity: e.g. "O(N^2)", "O(N^3)"
- bottleneck: specific code construct causing slowness
- root_cause: why this is too slow for the constraints
- simple_explanation: beginner-friendly
- slow_code_snippet: the slow portion of code
- optimization_approach: what algorithm/structure change to make
- target_complexity: e.g. "O(N log N)" or "O(N)"
- confidence: 0 to 1

Output ONLY JSON. No markdown. No code fences. No extra text.`;

  const timeInfo = submission.executionTimeMs ? `Execution Time: ${submission.executionTimeMs}ms (exceeded limit)` : '';

  const user = `Language: ${submission.language}
${timeInfo}

Source Code:
${submission.sourceCode.substring(0, 4000)}`;

  return { system, user };
}
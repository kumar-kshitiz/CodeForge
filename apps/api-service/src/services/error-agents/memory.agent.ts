import { z } from 'zod';

export const MemoryErrorSchema = z.object({
  error_type: z.literal('memory_limit_exceeded'),
  language: z.string(),
  estimated_space_complexity: z.string(),
  memory_hog: z.string(),
  root_cause: z.string(),
  simple_explanation: z.string(),
  problematic_allocation: z.string(),
  optimization_approach: z.string(),
  target_space_complexity: z.string(),
  confidence: z.number().min(0).max(1),
});

export type MemoryErrorFeedback = z.infer<typeof MemoryErrorSchema>;

export function buildMemoryPrompt(submission: {
  language: string;
  sourceCode: string;
}): { system: string; user: string } {
  const system = `You are a specialized memory optimization agent. Your ONLY responsibility is to analyze Memory Limit Exceeded (MLE) verdicts and identify excessive memory usage.

You are given:
- programming language
- user source code

Your task:
1. Estimate the space complexity of the solution.
2. Identify the largest memory allocations (arrays, matrices, recursion depth, etc.).
3. Explain why the solution uses too much memory.
4. Suggest a way to reduce memory usage.
5. State the target space complexity.

Important rules:
- Focus on memory usage, not time complexity (unless a time-memory tradeoff is relevant).
- Point to specific data structures or allocations that are oversized.
- Do not rewrite the entire solution.
- Consider language-specific memory overheads (e.g., Python object overhead, recursion stack in C++).

You must return ONLY valid JSON matching this schema exactly:
{
  "error_type": "memory_limit_exceeded",
  "language": "...",
  "estimated_space_complexity": "...",
  "memory_hog": "...",
  "root_cause": "...",
  "simple_explanation": "...",
  "problematic_allocation": "...",
  "optimization_approach": "...",
  "target_space_complexity": "...",
  "confidence": 0.0
}

- estimated_space_complexity: e.g. "O(N^2)"
- memory_hog: specific variable/structure consuming excessive memory
- root_cause: technical reason for MLE
- simple_explanation: beginner-friendly
- problematic_allocation: the specific code that allocates too much
- optimization_approach: how to reduce memory
- target_space_complexity: target after optimization
- confidence: 0 to 1

Output ONLY JSON. No markdown. No code fences. No extra text.`;

  const user = `Language: ${submission.language}

Source Code:
${submission.sourceCode.substring(0, 4000)}`;

  return { system, user };
}


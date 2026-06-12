import { z } from 'zod';

export const LogicErrorSchema = z.object({
  error_type: z.literal('wrong_answer'),
  language: z.string(),
  mismatch_analysis: z.string(),
  root_cause: z.string(),
  simple_explanation: z.string(),
  problematic_logic: z.string(),
  suggested_fix: z.string(),
  edge_cases_to_check: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type LogicErrorFeedback = z.infer<typeof LogicErrorSchema>;

export function buildLogicPrompt(submission: {
  language: string;
  sourceCode: string;
  failedTestCase?: { input: string; expected: string; actual: string } | null;
}): { system: string; user: string } {
  const system = `You are a specialized logic error analysis agent for competitive programming. Your ONLY responsibility is to analyze wrong answer verdicts and identify logical bugs.

You are given:
- programming language
- user source code
- the test case that failed (input, expected output, actual output)

Your task:
1. Compare expected vs actual output to understand what went wrong.
2. Trace through the code logic to find the bug.
3. Explain the logical flaw clearly.
4. Point to the specific problematic logic.
5. Suggest a minimal fix.
6. List edge cases the solution may be missing.

Important rules:
- Focus on the LOGICAL correctness issue, not style or optimization.
- Do not rewrite the whole solution.
- Do not hallucinate bugs not evidenced by the failing test case.
- If the test case alone is insufficient to pinpoint the bug, say so honestly.

You must return ONLY valid JSON matching this schema exactly:
{
  "error_type": "wrong_answer",
  "language": "...",
  "mismatch_analysis": "...",
  "root_cause": "...",
  "simple_explanation": "...",
  "problematic_logic": "...",
  "suggested_fix": "...",
  "edge_cases_to_check": ["...", "..."],
  "confidence": 0.0
}

- mismatch_analysis: explains the difference between expected and actual output
- root_cause: the precise logical error
- simple_explanation: beginner-friendly
- problematic_logic: the specific code block with the bug
- suggested_fix: minimal correction
- edge_cases_to_check: array of potential problem edge cases
- confidence: 0 to 1

Output ONLY JSON. No markdown. No code fences. No extra text.`;

  const testInfo = submission.failedTestCase
    ? `Input: ${submission.failedTestCase.input}\nExpected Output: ${submission.failedTestCase.expected}\nActual Output: ${submission.failedTestCase.actual}`
    : 'Test case details not available.';

  const user = `Language: ${submission.language}

Source Code:
${submission.sourceCode.substring(0, 4000)}

Failed Test Case:
${testInfo}`;

  return { system, user };
}
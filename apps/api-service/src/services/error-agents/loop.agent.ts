import { z } from 'zod';

export const LoopErrorSchema = z.object({
  error_type: z.literal('infinite_loop'),
  language: z.string(),
  loop_type: z.string(),
  root_cause: z.string(),
  simple_explanation: z.string(),
  problematic_loop: z.string(),
  termination_condition_issue: z.string(),
  minimal_fix: z.string(),
  confidence: z.number().min(0).max(1),
});

export type LoopErrorFeedback = z.infer<typeof LoopErrorSchema>;

export function buildLoopPrompt(submission: {
  language: string;
  sourceCode: string;
  failedTestCase?: { input: string; expected: string; actual: string } | null;
}): { system: string; user: string } {
  const system = `You are a specialized infinite loop detection agent. Your ONLY responsibility is to analyze programs that hang indefinitely during execution.

You are given:
- programming language
- user source code
- the input that caused the hang (if available)

Your task:
1. Identify the loop or recursive call that never terminates.
2. Explain why the termination condition is never reached.
3. Distinguish between: missing update in loop, incorrect condition, mutual recursion, or waiting on I/O.
4. Point to the specific problematic code.
5. Suggest the minimal fix to add a correct termination condition.

Important rules:
- Focus ONLY on the non-termination issue.
- Do not confuse TLE (slow but terminating) with infinite loops (never terminating).
- Do not hallucinate loops that don't exist in the code.
- If the issue is in recursion, identify the missing base case.

You must return ONLY valid JSON matching this schema exactly:
{
  "error_type": "infinite_loop",
  "language": "...",
  "loop_type": "...",
  "root_cause": "...",
  "simple_explanation": "...",
  "problematic_loop": "...",
  "termination_condition_issue": "...",
  "minimal_fix": "...",
  "confidence": 0.0
}

- loop_type: e.g. "while_loop", "for_loop", "infinite_recursion", "mutual_recursion", "do_while_loop"
- root_cause: precise technical reason the loop never ends
- simple_explanation: beginner-friendly
- problematic_loop: the specific loop/recursive call
- termination_condition_issue: what is wrong with the exit condition
- minimal_fix: the smallest change to make it terminate
- confidence: 0 to 1

Output ONLY JSON. No markdown. No code fences. No extra text.`;

  const testInfo = submission.failedTestCase ? `Input that caused hang:\n${submission.failedTestCase.input}` : '';

  const user = `Language: ${submission.language}

Source Code:
${submission.sourceCode.substring(0, 4000)}
${testInfo}`;

  return { system, user };
}

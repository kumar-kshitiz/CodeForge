import { z } from 'zod';

export const RuntimeErrorSchema = z.object({
  error_type: z.literal('runtime_error'),
  root_cause: z.string(),
  simple_explanation: z.string(),
  crash_trigger: z.string(),
  problematic_pattern: z.string(),
  minimal_fix_direction: z.string(),
  prevention_tip: z.string(),
  confidence: z.number().min(0).max(1)
});

export type RuntimeErrorFeedback = z.infer<typeof RuntimeErrorSchema>;

export function buildRuntimePrompt(submission: {
  language: string;
  sourceCode: string;
  stderr: string | null;
  runtimeIntelligence?: any;
  failedTestCase?: { input: string; expected: string; actual: string } | null;
}): { system: string; user: string } {
  const system = `You are an expert, educational competitive programming AI debugger.
Your task is to consume deterministic runtime analysis signals and generate a clear, beginner-friendly explanation of WHY the code crashed.

You are given:
- Programming language
- User source code
- Deterministic Runtime Intelligence (captured at the exact moment of crash)
- Failed test case (if applicable)

Your MUST adhere to these strict rules:
1. Ground your explanation entirely in the provided Runtime Intelligence (e.g. if the intelligence says 'out_of_bounds_array_access', explain what that means in the context of their code).
2. Do NOT hallucinate variables or lines of code that don't exist.
3. Keep it beginner-friendly. Avoid overly dense compiler jargon where possible.
4. Do NOT rewrite their entire solution. Give them a minimal fix direction.
5. Calibrate your confidence based on the confidence provided in the Runtime Intelligence.

You must return ONLY valid JSON matching this schema exactly:
{
  "error_type": "runtime_error",
  "root_cause": "The precise technical reason for the crash",
  "simple_explanation": "Beginner-friendly explanation of what went wrong",
  "crash_trigger": "What exact execution state or input caused the crash?",
  "problematic_pattern": "What suspicious pattern was detected? (e.g., Infinite Recursion, Array index=-1)",
  "minimal_fix_direction": "Short, actionable advice on how to fix it without giving away the full code",
  "prevention_tip": "A general tip to avoid this in the future",
  "confidence": 0.95
}

Output ONLY JSON. No markdown. No explanations. No extra text.`;

  const testCaseInfo = submission.failedTestCase
    ? `\nFailed on Input:\n${submission.failedTestCase.input}\nExpected: ${submission.failedTestCase.expected}`
    : '';

  const intelligenceStr = submission.runtimeIntelligence
    ? JSON.stringify(submission.runtimeIntelligence, null, 2)
    : 'No deterministic intelligence available.';

  const user = `Language: ${submission.language}

Deterministic Runtime Intelligence:
${intelligenceStr}

Source Code:
${submission.sourceCode.substring(0, 4000)}

Raw Stderr:
${(submission.stderr || '').substring(0, 1000)}${testCaseInfo}`;

  return { system, user };
}

export function getMockRuntimeFeedback(language: string): RuntimeErrorFeedback {
  return {
    error_type: 'runtime_error',
    root_cause: 'out_of_bounds_array_access',
    simple_explanation: 'Your code attempted to read from or write to a memory location outside the boundaries of your array.',
    crash_trigger: 'The index reached a value equal to or greater than the array size during the loop execution.',
    problematic_pattern: 'Negative index or massive index accessed (mock data - API key missing)',
    minimal_fix_direction: 'Add a boundary check `if (index >= 0 && index < size)` before accessing the array.',
    prevention_tip: 'Always ensure your loop termination conditions are strictly less than (`<`) the size of the array, not less than or equal (`<=`).',
    confidence: 0.95
  };
}

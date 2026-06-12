import { z } from 'zod';

export const CompileErrorSchema = z.object({
  error_type: z.literal('compile_error'),
  language: z.string(),
  root_cause: z.string(),
  simple_explanation: z.string(),
  problematic_code: z.string(),
  minimal_fix: z.string(),
  compiler_message_summary: z.string(),
  confidence: z.number().min(0).max(1),
});

export type CompileErrorFeedback = z.infer<typeof CompileErrorSchema>;

export function buildCompilePrompt(submission: {
  language: string;
  sourceCode: string;
  stderr: string | null;
}): { system: string; user: string } {
  const system = `You are a specialized compiler error analysis agent. Your ONLY responsibility is to analyze compiler errors and explain them accurately.

You are given:
- programming language
- user source code
- compiler stderr output

Your task:
1. Identify the FIRST meaningful root compile error.
2. Explain the real cause clearly.
3. Explain it in beginner-friendly language.
4. Point to the problematic code snippet if possible.
5. Suggest only the MINIMAL correction required.
6. Avoid changing unrelated logic.
7. Avoid rewriting the entire solution.
8. Avoid hallucinating additional bugs.
9. Prioritize deterministic reasoning over speculation.
10. If the compiler output is ambiguous, explicitly mention uncertainty.

Important rules:
- Focus ONLY on compilation issues.
- Ignore runtime or logical correctness.
- Do not optimize the algorithm.
- Do not solve the original coding problem.
- Do not generate full corrected code unless absolutely necessary.
- If multiple compiler errors exist, prioritize the earliest/root error because later errors may be cascading failures.

You must return ONLY valid JSON.

Output Schema:
{
  "error_type": "compile_error",
  "language": "...",
  "root_cause": "...",
  "simple_explanation": "...",
  "problematic_code": "...",
  "minimal_fix": "...",
  "compiler_message_summary": "...",
  "confidence": 0.0
}

Field Rules:
- root_cause: precise technical issue
- simple_explanation: beginner-friendly explanation
- problematic_code: only the small relevant snippet
- minimal_fix: shortest correction guidance possible
- compiler_message_summary: simplified interpretation of compiler stderr
- confidence: number between 0 and 1

Strict Rules:
- Output ONLY JSON.
- No markdown.
- No extra commentary.
- No code fences.
- No conversational text.`;

  const user = `Language: ${submission.language}

Source Code:
${submission.sourceCode.substring(0, 4000)}

Compiler Error Output (stderr):
${(submission.stderr || '').substring(0, 2000)}`;

  return { system, user };
}
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { env } from '../config/env';

// ─── Error Agents ────────────────────────────────────────────────────────────
import { buildCompilePrompt, CompileErrorSchema } from './error-agents/compile.agent';
import { buildRuntimePrompt, RuntimeErrorSchema } from './error-agents/runtime.agent';
import { buildLogicPrompt, LogicErrorSchema } from './error-agents/logic.agent';
import { buildComplexityPrompt, ComplexityErrorSchema } from './error-agents/complexity.agent';
import { buildMemoryPrompt, MemoryErrorSchema } from './error-agents/memory.agent';
import { buildLoopPrompt, LoopErrorSchema } from './error-agents/loop.agent';

const genAI = env.geminiApiKey ? new GoogleGenerativeAI(env.geminiApiKey) : null;

// The strict JSON structure we expect from the AI
const FeedbackSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  optimizations: z.array(z.string()),
  complexityEstimate: z.string(),
  readabilityScore: z.number().int().min(0).max(100),
});

export type AIFeedback = z.infer<typeof FeedbackSchema>;

export async function generateFeedback(submissionId: string) {
  // 1. Check Cache
  const existing = await prisma.submissionFeedback.findUnique({
    where: { submissionId },
  });
  if (existing) return existing;

  // 2. Fetch Submission Data
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { problem: true }
  });

  if (!submission || !submission.problem) {
    throw new Error('Submission or problem not found');
  }

  // 3. Fallback Mock if no API key
  if (!genAI) {
    console.log('[AI] Missing GEMINI_API_KEY, using mock fallback.');
    return saveFeedback(submissionId, {
      summary: 'This is a mock AI review because the Gemini API key is missing. The solution works effectively.',
      strengths: ['Cleanly formatted', 'Variable names are understandable'],
      weaknesses: ['Lack of comments', 'Missing edge case validation for empty inputs'],
      optimizations: ['Consider returning early to reduce nesting.'],
      complexityEstimate: 'O(N) Time, O(1) Space',
      readabilityScore: 85,
    });
  }

  // 4. Prompt Engineering
  const systemPrompt = `You are an expert Senior Software Engineer conducting a code review.
Analyze the provided code submission for a given problem.
You MUST output your response strictly as a JSON object matching this schema, with no markdown formatting or extra text:
{
  "summary": "High-level overview of the solution in 1-2 sentences",
  "strengths": ["array of strings"],
  "weaknesses": ["array of strings"],
  "optimizations": ["array of strings"],
  "complexityEstimate": "e.g., O(N) Time, O(1) Space",
  "readabilityScore": Integer between 0 and 100
}`;

  const userPrompt = `
Problem: ${submission.problem.title}
Description: ${submission.problem.description}
Language: ${submission.language}

Source Code:
${submission.sourceCode.substring(0, 5000)} // Truncate to save tokens if abnormally long
`;

  // 5. Gemini API Call
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.2,
    },
    systemInstruction: systemPrompt,
  });

  let response;
  try {
    response = await model.generateContent(userPrompt);
  } catch (err: any) {
    console.error("[AI:ReviewAgent] Gemini API Error:", err.message);
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
      throw new Error('Google Gemini API Rate Limit Exceeded. Please wait 1 minute and try again.');
    }
    throw new Error('Failed to generate AI feedback due to an API error.');
  }

  let content = response.response.text();
  if (!content) throw new Error('AI returned empty response');

  // Clean markdown fences if Gemini added them
  content = content.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();

  // 6. Response Validation
  try {
    const parsed = JSON.parse(content);
    const validData = FeedbackSchema.parse(parsed);
    return saveFeedback(submissionId, validData);
  } catch (err) {
    console.error('[AI] Failed to parse or validate AI JSON', err);
    throw new Error('AI returned an invalid feedback format');
  }
}

async function saveFeedback(submissionId: string, data: AIFeedback) {
  return prisma.submissionFeedback.create({
    data: {
      submissionId,
      summary: data.summary,
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      optimizations: data.optimizations,
      complexityEstimate: data.complexityEstimate,
      readabilityScore: data.readabilityScore,
    }
  });
}

// ─── Error Feedback (Specialized Agents) ─────────────────────────────────────

// Maps execution-service verdict strings to agent error type keys
type ErrorVerdictKey =
  | 'compilation_error'
  | 'runtime_error'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'infinite_loop';

const SUPPORTED_ERROR_VERDICTS = new Set<string>([
  'compilation_error',
  'runtime_error',
  'wrong_answer',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'infinite_loop',
]);

export async function generateErrorFeedback(submissionId: string) {
  // 1. Check Cache
  // @ts-ignore - Bypass IDE caching issue for newly generated Prisma client properties
  const existing = await (prisma as any).submissionErrorFeedback.findUnique({
    where: { submissionId },
  });
  if (existing) return existing;

  // 2. Fetch Submission
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    throw new Error('Submission not found');
  }

  const verdict = submission.verdict ?? '';

  if (!SUPPORTED_ERROR_VERDICTS.has(verdict)) {
    throw new Error(
      `Error feedback not supported for verdict: "${verdict}". ` +
      `Only error verdicts (compile, runtime, wrong answer, TLE, MLE, infinite loop) are supported.`
    );
  }

  const errorType = verdict as ErrorVerdictKey;

  // 3. Fallback mock if no API key
  if (!genAI) {
    return `[AI:ErrorAgent] Missing GEMINI_API_KEY`;
  }

  // 4. Build agent-specific prompt
  const failedTestCase = (submission as any).failedTestCase as
    | { input: string; expected: string; actual: string }
    | null
    | undefined;

  const { system, user } = buildAgentPrompt(errorType, {
    language: submission.language,
    sourceCode: submission.sourceCode,
    stderr: submission.stderr,
    executionTimeMs: submission.executionTimeMs,
    runtimeIntelligence: (submission as any).runtimeIntelligence,
    failedTestCase,
  });

  // 5. Call Gemini
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.1,
    },
    systemInstruction: system,
  });

  let response;
  try {
    response = await model.generateContent(user);
  } catch (err: any) {
    console.error("[AI:ErrorAgent] Gemini API Error:", err.message);
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
      throw new Error('Google Gemini API Rate Limit Exceeded. Please wait 1 minute and try again.');
    }
    throw new Error('Failed to generate AI feedback due to an API error.');
  }

  console.log("FINISH REASON:", response.response.candidates?.[0]?.finishReason);
  let content = response.response.text();
  if (!content) throw new Error('AI returned empty response');

  // Clean markdown fences if Gemini added them
  content = content.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();
  console.log("CLEANED CONTENT:", content);

  // 6. Validate with agent-specific schema
  try {
    const parsed = JSON.parse(content);
    const validated = validateAgentResponse(errorType, parsed);
    return saveErrorFeedback(submissionId, errorType, validated);
  } catch (err) {
    console.error(`[AI:ErrorAgent] Failed to validate response for ${errorType}`, err);
    throw new Error('AI returned an invalid error feedback format');
  }
}

function buildAgentPrompt(
  errorType: ErrorVerdictKey,
  submission: {
    language: string;
    sourceCode: string;
    stderr: string | null;
    executionTimeMs: number | null;
    runtimeIntelligence?: any;
    failedTestCase?: { input: string; expected: string; actual: string } | null;
  }
): { system: string; user: string } {
  switch (errorType) {
    case 'compilation_error':
      return buildCompilePrompt(submission);
    case 'runtime_error':
      return buildRuntimePrompt(submission);
    case 'wrong_answer':
      return buildLogicPrompt(submission);
    case 'time_limit_exceeded':
      return buildComplexityPrompt(submission);
    case 'memory_limit_exceeded':
      return buildMemoryPrompt(submission);
    case 'infinite_loop':
      return buildLoopPrompt(submission);
  }
}

function validateAgentResponse(errorType: ErrorVerdictKey, parsed: unknown): unknown {
  switch (errorType) {
    case 'compilation_error':
      return CompileErrorSchema.parse(parsed);
    case 'runtime_error':
      return RuntimeErrorSchema.parse(parsed);
    case 'wrong_answer':
      return LogicErrorSchema.parse(parsed);
    case 'time_limit_exceeded':
      return ComplexityErrorSchema.parse(parsed);
    case 'memory_limit_exceeded':
      return MemoryErrorSchema.parse(parsed);
    case 'infinite_loop':
      return LoopErrorSchema.parse(parsed);
  }
}


async function saveErrorFeedback(submissionId: string, errorType: string, agentResponse: unknown) {
  // @ts-ignore - Bypass IDE caching issue for newly generated Prisma client properties
  return (prisma as any).submissionErrorFeedback.create({
    data: {
      submissionId,
      errorType,
      agentResponse: agentResponse as any,
    },
  });
}

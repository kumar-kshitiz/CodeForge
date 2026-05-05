import OpenAI from 'openai';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { env } from '../config/env';

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

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
  if (!openai) {
    console.log('[AI] Missing OPENAI_API_KEY, using mock fallback.');
    return saveFeedback(submissionId, {
      summary: 'This is a mock AI review because the OpenAI API key is missing. The solution works effectively.',
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

  // 5. OpenAI API Call
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 600,
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('AI returned empty response');

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

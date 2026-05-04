import { z } from 'zod';

const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp'] as const;

export const createSubmissionSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES, { message: 'Unsupported language' }),
  sourceCode: z.string().min(1, 'Source code cannot be empty').max(50000),
  problemId: z.string().optional(),
  roomId: z.string().optional(),
  contestId: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
  verdict: z.string().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  executionTimeMs: z.number().int().optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

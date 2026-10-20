import { z } from "zod";

const SUPPORTED_LANGUAGES = ["javascript", "python", "cpp"] as const;

export const createSubmissionSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES, { message: "Unsupported language" }),
  sourceCode: z.string().min(1, "Source code cannot be empty").max(50000),
  problemId: z.string().min(1, "Problem is required"),
  teamMatchId: z.string().uuid().optional(),
  mode: z.enum(["RUN", "SUBMIT"]).default("SUBMIT"),
});

export const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  verdict: z.string().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  runtimeMs: z.number().int().nonnegative().optional(),
  memoryKb: z.number().int().nonnegative().optional(),
  passedTestCases: z.number().int().optional(),
  totalTestCases: z.number().int().optional(),
  failedTestCase: z.any().optional(),
  runtimeIntelligence: z.any().optional(),
  testResults: z
    .array(
      z.object({
        testCaseId: z.string().min(1),
        verdict: z.string().min(1),
        runtimeMs: z.number().int().nonnegative().optional(),
        memoryKb: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

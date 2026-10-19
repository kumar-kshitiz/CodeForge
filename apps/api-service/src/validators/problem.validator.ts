import { z } from "zod";

const languageSchema = z.enum(["javascript", "python", "cpp"]);

export const createProblemSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(2).max(200),
  difficulty: z.enum(["easy", "medium", "hard"]),
  statementMd: z.string().min(1),
  constraintsMd: z.string().default(""),
  timeLimitMs: z.number().int().min(100).max(60000).default(2000),
  memoryLimitMb: z.number().int().min(16).max(2048).default(256),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  kind: z.enum(["QUESTION", "CHALLENGE"]).default("QUESTION"),
  challengeEndsAt: z.coerce.date().optional().nullable(),
  publishAfterChallenge: z.boolean().default(false),
  starterCode: z.partialRecord(languageSchema, z.string()).optional(),
  tags: z.array(z.string().min(1).max(50)).default([]),
  examples: z
    .array(
      z.object({
        inputText: z.string(),
        outputText: z.string(),
        explanation: z.string().optional(),
      }),
    )
    .default([]),
  testCases: z
    .array(
      z.object({
        visibility: z.enum(["PUBLIC", "HIDDEN"]).default("HIDDEN"),
        inputText: z.string(),
        expectedOutputText: z.string(),
        points: z.number().int().positive().default(1),
        groupId: z.string().min(1).optional(),
      }),
    )
    .min(1, "At least one test case is required"),
  officialSolutions: z
    .array(
      z.object({
        language: languageSchema,
        sourceCode: z.string().min(1),
        editorialMd: z.string().default(""),
        visibility: z.enum(["PRIVATE", "PUBLIC"]).default("PRIVATE"),
      }),
    )
    .default([]),
}).superRefine((problem, context) => {
  if (problem.kind !== "CHALLENGE") return;
  if (!problem.challengeEndsAt) {
    context.addIssue({
      code: "custom",
      path: ["challengeEndsAt"],
      message: "Challenge end time is required",
    });
  } else if (problem.challengeEndsAt.getTime() <= Date.now()) {
    context.addIssue({
      code: "custom",
      path: ["challengeEndsAt"],
      message: "Challenge end time must be in the future",
    });
  }
});

export type CreateProblemInput = z.infer<typeof createProblemSchema>;

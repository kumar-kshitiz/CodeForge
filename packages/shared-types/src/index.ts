// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "interviewer" | "candidate";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

// ─── Problem ─────────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";

export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  statementMd: string;
  constraintsMd: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
  kind: "QUESTION" | "CHALLENGE";
  challengeEndsAt?: Date | string | null;
  publishAfterChallenge: boolean;
  examples: ProblemExample[];
  starterCode?: Record<string, string>;
}

export interface ProblemExample {
  id: string;
  inputText: string;
  outputText: string;
  explanation?: string;
  position: number;
}

// ─── Execution ───────────────────────────────────────────────────────────────

export type SupportedLanguage = "javascript" | "python" | "cpp";

export type SubmissionStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface TestCasePayload {
  id: string;
  input: string;
  expectedOutput: string;
  visibility: "PUBLIC" | "HIDDEN";
  points: number;
  position: number;
  groupId?: string;
}

export interface QueueJobPayload {
  submissionId: string;
  userId: string;
  language: SupportedLanguage;
  sourceCode: string;
  problemSlug?: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases?: TestCasePayload[];
}

export interface FailedTestCase {
  input: string;
  expected: string;
  actual: string;
}

export interface SubmissionResult {
  verdict: Verdict;
  stdout: string;
  stderr: string;
  runtimeMs: number;
  memoryKb?: number;
  passedTestCases?: number;
  totalTestCases?: number;
  failedTestCase?: FailedTestCase;
  testResults?: SubmissionTestResultPayload[];
}

export interface SubmissionTestResultPayload {
  testCaseId: string;
  verdict: Verdict;
  runtimeMs?: number;
  memoryKb?: number;
}

export interface ExecutionJob {
  submissionId: string;
  userId: string;
  language: SupportedLanguage;
  code: string;
  stdin?: string;
  result?: ExecutionResult;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsedKb: number;
  stdin?: string;
}

// ─── Submission ──────────────────────────────────────────────────────────────

export type Verdict =
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "memory_limit_exceeded"
  | "runtime_error"
  | "compilation_error"
  | "pending";

export interface JudgeResult {
  submissionId: string;
  verdict: Verdict;
  runtime: number;
  memory: number;
  passedCases: number;
  totalCases: number;
}

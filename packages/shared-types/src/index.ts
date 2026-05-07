// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'interviewer' | 'candidate';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

// ─── Room ────────────────────────────────────────────────────────────────────

export type RoomStatus = 'waiting' | 'active' | 'ended';

export interface Room {
  id: string;
  name: string;
  hostId: string;
  participantIds: string[];
  status: RoomStatus;
  problemId: string | null;
  createdAt: Date;
}

// ─── Problem ─────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  constraints: string;
  examples: ProblemExample[];
  starterCode: Record<string, string>;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

// ─── Execution ───────────────────────────────────────────────────────────────

export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'java' | 'cpp';

export type SubmissionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface TestCasePayload {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface QueueJobPayload {
  submissionId: string;
  userId: string;
  roomId?: string;
  language: SupportedLanguage;
  sourceCode: string;
  problemSlug?: string;
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
  executionTimeMs: number;
  memoryUsed?: string;
  passedTestCases?: number;
  totalTestCases?: number;
  failedTestCase?: FailedTestCase;
}


export interface ExecutionJob {
  submissionId: string;
  roomId: string;
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

export type Verdict = 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'runtime_error' | 'compilation_error' | 'pending';

export interface JudgeResult {
  submissionId: string;
  verdict: Verdict;
  runtime: number;
  memory: number;
  passedCases: number;
  totalCases: number;
}

// ─── Socket Events ───────────────────────────────────────────────────────────

export enum SocketEvent {
  JOIN_ROOM      = 'room:join',
  LEAVE_ROOM     = 'room:leave',
  USER_JOINED    = 'room:user_joined',
  USER_LEFT      = 'room:user_left',
  PARTICIPANTS   = 'room:participants',
  CODE_CHANGE    = 'code:change',
  CODE_UPDATE    = 'code:update',
  LANGUAGE_CHANGE = 'language:change',
  LANGUAGE_UPDATE = 'language:update',
  CURSOR_UPDATE  = 'cursor:update',
  ROOM_SNAPSHOT  = 'room:snapshot',
  EXECUTION_STARTED = 'execution:started',
  EXECUTION_RESULT  = 'execution:result',
  SUBMISSION_QUEUED = 'submission:queued',
  SUBMISSION_PROCESSING = 'submission:processing',
  SUBMISSION_COMPLETED = 'submission:completed',
  SUBMISSION_FAILED = 'submission:failed',
  CHAT_MESSAGE   = 'chat:message',
  CONTEST_LEADERBOARD_UPDATE = 'contest:leaderboard_update',
}

export interface RoomUser {
  socketId: string;
  userId: string;
  username: string;
}

export interface JoinRoomPayload {
  roomId: string;
  userId: string;
  username: string;
}

export interface CodePayload {
  roomId: string;
  code: string;
  language: string;
}

export interface LangPayload {
  roomId: string;
  language: string;
}

export interface CursorPayload {
  roomId: string;
  userId: string;
  username: string;
  line: number;
  column: number;
}


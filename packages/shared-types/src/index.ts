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

export interface SubmissionResult {
  submissionId: string;
  verdict: Verdict;
  runtime: number;
  memory: number;
  passedCases: number;
  totalCases: number;
}

// ─── Socket Events ───────────────────────────────────────────────────────────

export enum SocketEvent {
  JOIN_ROOM = 'join:room',
  LEAVE_ROOM = 'leave:room',
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left',
  CODE_CHANGE = 'code:change',
  LANGUAGE_CHANGE = 'language:change',
  EXECUTION_STARTED = 'execution:started',
  EXECUTION_RESULT = 'execution:result',
  CURSOR_MOVE = 'cursor:move',
  CHAT_MESSAGE = 'chat:message',
}

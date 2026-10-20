export type Difficulty = "EASY" | "MEDIUM" | "TOUGH";
export type MatchStatus =
  | "LOBBY"
  | "MATCHMAKING"
  | "DRAFTING"
  | "LIVE"
  | "FINISHED"
  | "CANCELLED";

export interface Player {
  userId: string;
  username: string;
  joinedAt: string;
  questionId?: string;
  questionSlug?: string;
  questionTitle?: string;
  score: number;
  solvedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  players: Player[];
  difficultyVote?: Difficulty;
  leaderId?: string;
  draftsForTeamId?: string;
  selectedQuestionIds: string[];
  score: number;
  abilityActivatedAt?: string;
  abilityPuzzleScore: number;
  currentPuzzleId?: string;
  lastPuzzleId?: string;
}

export interface TeamMatch {
  id: string;
  inviteCode: string;
  name: string;
  createdBy: string;
  status: MatchStatus;
  difficulty?: Difficulty;
  durationMinutes: number;
  desiredTeamCount: number;
  teams: Team[];
  redirectToMatchId?: string;
  startsAt?: string;
  endsAt?: string;
  winnerTeamIds: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

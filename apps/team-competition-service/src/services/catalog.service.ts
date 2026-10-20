import { env } from "../config/env";
import type { Difficulty } from "../types/match";

export interface CatalogQuestion {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  tags: { name: string }[];
}

export interface AbilityPuzzle {
  id: string;
  prompt: string;
  options?: string[] | null;
  correctOption?: number | null;
  answerText?: string | null;
  explanation?: string | null;
}

export async function getQuestionCatalog(
  difficulty: Difficulty,
): Promise<CatalogQuestion[]> {
  const expected = difficulty === "TOUGH" ? "hard" : difficulty.toLowerCase();
  const response = await fetch(`${env.apiServiceUrl}/api/internal/team-questions?difficulty=${expected}`, {
    headers: { "x-internal-key": env.internalServiceKey },
  });
  if (!response.ok) {
    throw Object.assign(new Error("Question catalog is unavailable"), {
      statusCode: 502,
    });
  }
  const data = (await response.json()) as { questions?: CatalogQuestion[] };
  return data.questions ?? [];
}

export async function getAbilityPuzzleCatalog(): Promise<AbilityPuzzle[]> {
  const response = await fetch(`${env.apiServiceUrl}/api/internal/ability-puzzles`, {
    headers: { "x-internal-key": env.internalServiceKey },
  });
  if (!response.ok) {
    throw Object.assign(new Error("Ability puzzle catalog is unavailable"), {
      statusCode: 502,
    });
  }
  const data = (await response.json()) as { puzzles?: AbilityPuzzle[] };
  return data.puzzles ?? [];
}

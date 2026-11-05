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

// Power Surge must remain playable even before an administrator adds custom
// puzzles or runs the optional database seed task.
const BUILT_IN_ABILITY_PUZZLES: AbilityPuzzle[] = [
  {
    id: "builtin-power-surge-binary",
    prompt: "What is binary 1010 in decimal?",
    options: ["8", "9", "10", "12"],
    correctOption: 2,
    explanation: "1010₂ equals 8 + 2.",
  },
  {
    id: "builtin-power-surge-sequence",
    prompt: "What comes next: 2, 4, 8, 16, ?",
    options: ["24", "30", "32", "34"],
    correctOption: 2,
    explanation: "Each number is doubled.",
  },
  {
    id: "builtin-power-surge-stack",
    prompt: "Which data structure follows Last In, First Out?",
    options: ["Queue", "Stack", "Heap", "Graph"],
    correctOption: 1,
    explanation: "A stack removes the most recently added item first.",
  },
  {
    id: "builtin-power-surge-search",
    prompt: "What is the worst-case time complexity of binary search?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
    correctOption: 1,
    explanation: "Binary search halves the remaining search space each time.",
  },
  {
    id: "builtin-power-surge-reverse",
    prompt: "Reverse the string CODE.",
    options: ["EDOC", "DOCE", "ECOD", "OCED"],
    correctOption: 0,
    explanation: "Reading the characters from right to left gives EDOC.",
  },
];

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
  return data.puzzles?.length ? data.puzzles : BUILT_IN_ABILITY_PUZZLES;
}

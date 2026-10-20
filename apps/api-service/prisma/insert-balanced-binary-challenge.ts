import { PrismaClient } from "@prisma/client";
import { createInlineContentKey } from "../src/utils/content-key";

const prisma = new PrismaClient();
const slug = "longest-balanced-binary-segment-challenge";

const starterCode = {
  javascript: `const fs = require("fs");

const values = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);
const n = values[0];
const numbers = values.slice(1, n + 1);

// Print the length of the longest balanced contiguous segment.`,
  python: `import sys

values = list(map(int, sys.stdin.buffer.read().split()))
n = values[0]
numbers = values[1:n + 1]

# Print the length of the longest balanced contiguous segment.`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> numbers(n);
    for (int &value : numbers) cin >> value;

    // Print the length of the longest balanced contiguous segment.
    return 0;
}`,
};

const examples = [
  {
    inputText: "6\n0 1 0 0 1 1",
    outputText: "6",
    explanation: "The entire array contains three zeroes and three ones.",
  },
  {
    inputText: "5\n0 1 1 1 0",
    outputText: "2",
    explanation: "Several length-two segments contain one zero and one one.",
  },
];

const tests = [
  ["6\n0 1 0 0 1 1", "6", "PUBLIC", 10, "examples"],
  ["5\n0 1 1 1 0", "2", "PUBLIC", 10, "examples"],
  ["1\n0", "0", "HIDDEN", 15, "edge-cases"],
  ["8\n1 1 1 1 0 0 0 0", "8", "HIDDEN", 20, "full-balance"],
  ["10\n0 0 1 0 1 1 0 1 1 1", "8", "HIDDEN", 20, "mixed"],
  ["7\n1 1 1 1 1 1 1", "0", "HIDDEN", 10, "single-value"],
  ["12\n0 1 0 1 1 0 0 0 1 1 1 0", "12", "HIDDEN", 15, "large-balance"],
] as const;

const officialSource = `const fs = require("fs");
const values = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);
const n = values[0];
const firstIndex = new Map([[0, -1]]);
let balance = 0;
let answer = 0;

for (let index = 0; index < n; index++) {
  balance += values[index + 1] === 1 ? 1 : -1;
  if (firstIndex.has(balance)) {
    answer = Math.max(answer, index - firstIndex.get(balance));
  } else {
    firstIndex.set(balance, index);
  }
}
console.log(answer);`;

async function main() {
  const challenge = await prisma.$transaction(async (tx) => {
    const saved = await tx.problem.upsert({
      where: { slug },
      update: {
        title: "Longest Balanced Binary Segment",
        difficulty: "MEDIUM",
        statementMd: `Given a binary array, find the maximum length of a contiguous segment containing the same number of zeroes and ones.

### Input format
- The first line contains an integer \`n\`.
- The second line contains \`n\` space-separated values, each either \`0\` or \`1\`.

### Output format
Print the length of the longest balanced contiguous segment. Print \`0\` if no balanced segment exists.`,
        constraintsMd: "- `1 ≤ n ≤ 200,000`\n- Every array element is `0` or `1`.",
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        status: "PUBLISHED",
        kind: "CHALLENGE",
        challengeEndsAt: new Date("2026-10-27T23:59:59.000Z"),
        publishAfterChallenge: true,
        starterCode,
        tags: {
          set: [],
          connectOrCreate: ["array", "prefix-sum", "hash-map"].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
      create: {
        slug,
        title: "Longest Balanced Binary Segment",
        difficulty: "MEDIUM",
        statementMd: `Given a binary array, find the maximum length of a contiguous segment containing the same number of zeroes and ones.

### Input format
- The first line contains an integer \`n\`.
- The second line contains \`n\` space-separated values, each either \`0\` or \`1\`.

### Output format
Print the length of the longest balanced contiguous segment. Print \`0\` if no balanced segment exists.`,
        constraintsMd: "- `1 ≤ n ≤ 200,000`\n- Every array element is `0` or `1`.",
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        status: "PUBLISHED",
        kind: "CHALLENGE",
        challengeEndsAt: new Date("2026-10-27T23:59:59.000Z"),
        publishAfterChallenge: true,
        starterCode,
        tags: {
          connectOrCreate: ["array", "prefix-sum", "hash-map"].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });

    for (const [position, example] of examples.entries()) {
      await tx.problemExample.upsert({
        where: { problemId_position: { problemId: saved.id, position } },
        update: example,
        create: { ...example, problemId: saved.id, position },
      });
    }

    for (const [position, [input, output, visibility, points, groupId]] of tests.entries()) {
      await tx.testCase.upsert({
        where: { problemId_position: { problemId: saved.id, position } },
        update: {
          inputKey: createInlineContentKey(input),
          expectedOutputKey: createInlineContentKey(output),
          visibility,
          points,
          groupId,
        },
        create: {
          problemId: saved.id,
          position,
          inputKey: createInlineContentKey(input),
          expectedOutputKey: createInlineContentKey(output),
          visibility,
          points,
          groupId,
        },
      });
    }

    await tx.officialSolution.upsert({
      where: { problemId_language: { problemId: saved.id, language: "javascript" } },
      update: {
        sourceKey: createInlineContentKey(officialSource),
        editorialMd: "Treat each zero as -1 and each one as +1. Equal prefix balances mark a segment whose total is zero. Store the first index of each balance and maximize the distance. Time: O(n). Space: O(n).",
        visibility: "PRIVATE",
      },
      create: {
        problemId: saved.id,
        language: "javascript",
        sourceKey: createInlineContentKey(officialSource),
        editorialMd: "Treat each zero as -1 and each one as +1. Equal prefix balances mark a segment whose total is zero. Store the first index of each balance and maximize the distance. Time: O(n). Space: O(n).",
        visibility: "PRIVATE",
      },
    });

    return saved;
  }, { timeout: 30_000 });

  console.log(`Inserted challenge ${challenge.slug} (${challenge.id}), ending ${challenge.challengeEndsAt?.toISOString()}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

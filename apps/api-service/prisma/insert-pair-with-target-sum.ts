import { PrismaClient } from "@prisma/client";
import { createInlineContentKey } from "../src/utils/content-key";

const prisma = new PrismaClient();

const starterCode = {
  javascript: `const fs = require("fs");

const input = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);
let cursor = 0;

const n = input[cursor++];
const numbers = input.slice(cursor, cursor + n);
cursor += n;
const target = input[cursor];

// Write your solution here`,
  python: `import sys

values = list(map(int, sys.stdin.buffer.read().split()))
cursor = 0

n = values[cursor]
cursor += 1
numbers = values[cursor:cursor + n]
cursor += n
target = values[cursor]

# Write your solution here`,
  cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> numbers(n);
    for (long long &value : numbers) cin >> value;

    long long target;
    cin >> target;

    // Write your solution here
    return 0;
}`,
};

const examples = [
  {
    inputText: "4\n2 7 11 15\n9",
    outputText: "0 1",
    explanation: "The values at indices 0 and 1 are 2 and 7. Their sum is 9.",
  },
  {
    inputText: "3\n3 2 4\n6",
    outputText: "1 2",
    explanation: "The values at indices 1 and 2 are 2 and 4. Their sum is 6.",
  },
];

const testCases = [
  { input: "4\n2 7 11 15\n9", output: "0 1", visibility: "PUBLIC", points: 10, groupId: "examples" },
  { input: "3\n3 2 4\n6", output: "1 2", visibility: "PUBLIC", points: 10, groupId: "examples" },
  { input: "2\n3 3\n6", output: "0 1", visibility: "HIDDEN", points: 20, groupId: "edge-cases" },
  { input: "5\n-5 -2 0 4 9\n4", output: "0 4", visibility: "HIDDEN", points: 20, groupId: "negative-values" },
  { input: "6\n10 20 30 40 50 60\n90", output: "2 5", visibility: "HIDDEN", points: 20, groupId: "standard" },
  { input: "7\n8 1 6 3 12 5 9\n15", output: "3 4", visibility: "HIDDEN", points: 20, groupId: "standard" },
];

const officialSource = `const fs = require("fs");

const input = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);
let cursor = 0;
const n = input[cursor++];
const numbers = input.slice(cursor, cursor + n);
cursor += n;
const target = input[cursor];
const seen = new Map();

for (let index = 0; index < n; index++) {
  const complement = target - numbers[index];
  if (seen.has(complement)) {
    console.log(\`${"${seen.get(complement)} ${index}"}\`);
    break;
  }
  seen.set(numbers[index], index);
}`;

async function main() {
  const problem = await prisma.$transaction(async (tx) => {
    const saved = await tx.problem.upsert({
      where: { slug: "pair-with-target-sum" },
      update: {
        title: "Pair With Target Sum",
        difficulty: "EASY",
        statementMd: `Given an array of integers and a target integer, find two distinct elements whose sum equals the target.

Print the zero-based indices of the two elements in increasing order.

Exactly one valid pair will exist in every test case, and the same array element cannot be used twice.

### Input format
- The first line contains an integer \`n\`, the number of elements.
- The second line contains \`n\` space-separated integers.
- The third line contains the target integer.

### Output format
Print two space-separated integers representing the indices of the required elements in increasing order.`,
        constraintsMd: `- \`2 ≤ n ≤ 100,000\`
- \`-1,000,000,000 ≤ array[i] ≤ 1,000,000,000\`
- \`-1,000,000,000 ≤ target ≤ 1,000,000,000\`
- Exactly one valid answer exists.
- The same element cannot be selected twice.`,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        status: "PUBLISHED",
        version: 1,
        starterCode,
        tags: {
          set: [],
          connectOrCreate: ["arrays", "hash-map", "searching"].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
      create: {
        slug: "pair-with-target-sum",
        title: "Pair With Target Sum",
        difficulty: "EASY",
        statementMd: `Given an array of integers and a target integer, find two distinct elements whose sum equals the target.

Print the zero-based indices of the two elements in increasing order.

Exactly one valid pair will exist in every test case, and the same array element cannot be used twice.

### Input format
- The first line contains an integer \`n\`, the number of elements.
- The second line contains \`n\` space-separated integers.
- The third line contains the target integer.

### Output format
Print two space-separated integers representing the indices of the required elements in increasing order.`,
        constraintsMd: `- \`2 ≤ n ≤ 100,000\`
- \`-1,000,000,000 ≤ array[i] ≤ 1,000,000,000\`
- \`-1,000,000,000 ≤ target ≤ 1,000,000,000\`
- Exactly one valid answer exists.
- The same element cannot be selected twice.`,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        status: "PUBLISHED",
        version: 1,
        starterCode,
        tags: {
          connectOrCreate: ["arrays", "hash-map", "searching"].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });

    await tx.problemExample.deleteMany({ where: { problemId: saved.id } });
    await tx.problemExample.createMany({
      data: examples.map((example, position) => ({ ...example, problemId: saved.id, position })),
    });

    for (const [position, testCase] of testCases.entries()) {
      await tx.testCase.upsert({
        where: { problemId_position: { problemId: saved.id, position } },
        update: {
          visibility: testCase.visibility,
          inputKey: createInlineContentKey(testCase.input),
          expectedOutputKey: createInlineContentKey(testCase.output),
          points: testCase.points,
          groupId: testCase.groupId,
        },
        create: {
          problemId: saved.id,
          position,
          visibility: testCase.visibility,
          inputKey: createInlineContentKey(testCase.input),
          expectedOutputKey: createInlineContentKey(testCase.output),
          points: testCase.points,
          groupId: testCase.groupId,
        },
      });
    }

    await tx.officialSolution.upsert({
      where: { problemId_language: { problemId: saved.id, language: "javascript" } },
      update: {
        sourceKey: createInlineContentKey(officialSource),
        editorialMd: "Use a hash map of previously visited values and indices. For each value, check whether target minus the value is already present. Time: O(n). Space: O(n).",
        visibility: "PRIVATE",
      },
      create: {
        problemId: saved.id,
        language: "javascript",
        sourceKey: createInlineContentKey(officialSource),
        editorialMd: "Use a hash map of previously visited values and indices. For each value, check whether target minus the value is already present. Time: O(n). Space: O(n).",
        visibility: "PRIVATE",
      },
    });

    return saved;
  });

  console.log(`Inserted problem ${problem.slug} (${problem.id}) with 2 examples and 6 test cases.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

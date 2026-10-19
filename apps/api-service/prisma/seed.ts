import { PrismaClient } from "@prisma/client";
import { createInlineContentKey } from "../src/utils/content-key";

const prisma = new PrismaClient();

const problemSeeds = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    statementMd:
      "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers whose sum equals the target.",
    constraintsMd: [
      "- 2 ≤ nums.length ≤ 10⁴",
      "- -10⁹ ≤ nums[i], target ≤ 10⁹",
      "- Exactly one valid answer exists.",
    ].join("\n"),
    starterCode: {
      javascript:
        "function twoSum(nums, target) {\n  // Write your code here\n}",
      python: "def twoSum(nums, target):\n    # Write your code here\n    pass",
      cpp: "#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Write your code here\n}",
    },
    examples: [
      {
        inputText: "nums = [2,7,11,15], target = 9",
        outputText: "[0,1]",
        explanation: "nums[0] + nums[1] equals 9.",
      },
      { inputText: "nums = [3,2,4], target = 6", outputText: "[1,2]" },
    ],
    testCases: [
      { input: "4 2 7 11 15 9", output: "0 1", visibility: "PUBLIC" },
      { input: "3 3 2 4 6", output: "1 2", visibility: "PUBLIC" },
      { input: "2 -3 4 1", output: "0 1", visibility: "HIDDEN" },
    ],
    tags: ["Array", "Hash Table"],
    officialJavascript:
      "function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n}",
    editorialMd:
      "Use a hash map to remember each previously visited value and its index. This gives O(n) time and O(n) space.",
  },
  {
    slug: "reverse-string",
    title: "Reverse String",
    difficulty: "easy",
    statementMd:
      "Reverse an array of characters in place using constant extra memory.",
    constraintsMd: [
      "- 1 ≤ s.length ≤ 10⁵",
      "- Every character is printable ASCII.",
    ].join("\n"),
    starterCode: {
      javascript: "function reverseString(s) {\n  // Write your code here\n}",
      python: "def reverseString(s):\n    # Write your code here\n    pass",
      cpp: "#include <vector>\nusing namespace std;\n\nvoid reverseString(vector<char>& s) {\n    // Write your code here\n}",
    },
    examples: [
      { inputText: "hello", outputText: "olleh" },
      { inputText: "Hannah", outputText: "hannaH" },
    ],
    testCases: [
      { input: "hello", output: "olleh", visibility: "PUBLIC" },
      { input: "Hannah", output: "hannaH", visibility: "PUBLIC" },
      { input: "a", output: "a", visibility: "HIDDEN" },
    ],
    tags: ["Two Pointers", "String"],
    officialJavascript:
      "function reverseString(s) {\n  let left = 0;\n  let right = s.length - 1;\n  while (left < right) {\n    [s[left], s[right]] = [s[right], s[left]];\n    left++;\n    right--;\n  }\n}",
    editorialMd:
      "Move two pointers inward, swapping the characters at their positions. This gives O(n) time and O(1) extra space.",
  },
] as const;

async function main() {
  for (const seed of problemSeeds) {
    const problem = await prisma.problem.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        difficulty: seed.difficulty,
        statementMd: seed.statementMd,
        constraintsMd: seed.constraintsMd,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        status: "PUBLISHED",
        starterCode: seed.starterCode,
        version: 1,
        tags: {
          set: [],
          connectOrCreate: seed.tags.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
      create: {
        slug: seed.slug,
        title: seed.title,
        difficulty: seed.difficulty,
        statementMd: seed.statementMd,
        constraintsMd: seed.constraintsMd,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        status: "PUBLISHED",
        starterCode: seed.starterCode,
        tags: {
          connectOrCreate: seed.tags.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });

    await prisma.problemExample.deleteMany({
      where: { problemId: problem.id },
    });

    await prisma.problemExample.createMany({
      data: seed.examples.map((example, position) => ({
        problemId: problem.id,
        inputText: example.inputText,
        outputText: example.outputText,
        explanation: "explanation" in example ? example.explanation : null,
        position,
      })),
    });

    await Promise.all(
      seed.testCases.map((testCase, position) =>
        prisma.testCase.upsert({
          where: {
            problemId_position: { problemId: problem.id, position },
          },
          update: {
            visibility: testCase.visibility,
            inputKey: createInlineContentKey(testCase.input),
            expectedOutputKey: createInlineContentKey(testCase.output),
            points: 1,
          },
          create: {
            problemId: problem.id,
            visibility: testCase.visibility,
            inputKey: createInlineContentKey(testCase.input),
            expectedOutputKey: createInlineContentKey(testCase.output),
            points: 1,
            position,
          },
        }),
      ),
    );

    await prisma.officialSolution.upsert({
      where: {
        problemId_language: {
          problemId: problem.id,
          language: "javascript",
        },
      },
      update: {
        sourceKey: createInlineContentKey(seed.officialJavascript),
        editorialMd: seed.editorialMd,
        visibility: "PRIVATE",
      },
      create: {
        problemId: problem.id,
        language: "javascript",
        sourceKey: createInlineContentKey(seed.officialJavascript),
        editorialMd: seed.editorialMd,
        visibility: "PRIVATE",
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

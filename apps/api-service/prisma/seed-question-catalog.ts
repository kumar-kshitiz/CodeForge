import { PrismaClient } from "@prisma/client";
import { createInlineContentKey } from "../src/utils/content-key";

const prisma = new PrismaClient();

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Case = [input: string, output: string];
type Question = {
  slug: string;
  title: string;
  difficulty: Difficulty;
  prompt: string;
  input: string;
  output: string;
  tags: string[];
  example: Case;
  tests: Case[];
};

const starterCode = {
  javascript: `const fs = require("fs");

const input = fs.readFileSync(0, "utf8").trim();

// Parse the input and write your solution here.
// Print the required answer with console.log().`,
  python: `import sys

data = sys.stdin.buffer.read().decode().strip()

# Parse the input and write your solution here.
# Print the required answer.`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Parse the input and write your solution here.
    return 0;
}`,
};

const q = (
  slug: string, title: string, difficulty: Difficulty, prompt: string,
  input: string, output: string, tags: string[], example: Case, ...tests: Case[]
): Question => ({ slug, title, difficulty, prompt, input, output, tags, example, tests });

const questions: Question[] = [
  // EASY (20)
  q("add-two-integers", "Add Two Integers", "EASY", "Given two integers, print their sum.", "Two integers `a b`.", "Their sum.", ["math"], ["7 5", "12"], ["-4 9", "5"], ["0 0", "0"]),
  q("even-or-odd", "Even or Odd", "EASY", "Determine whether an integer is even or odd.", "One integer `n`.", "Print `EVEN` or `ODD`.", ["math"], ["14", "EVEN"], ["-3", "ODD"], ["0", "EVEN"]),
  q("maximum-of-three", "Maximum of Three", "EASY", "Print the largest of three integers.", "Three integers `a b c`.", "The largest integer.", ["math"], ["8 3 6", "8"], ["-5 -2 -9", "-2"], ["4 4 1", "4"]),
  q("factorial-number", "Factorial of a Number", "EASY", "Compute `n!`.", "An integer `n` where `0 ≤ n ≤ 20`.", "The factorial of `n`.", ["math", "iteration"], ["5", "120"], ["0", "1"], ["10", "3628800"]),
  q("nth-fibonacci", "Nth Fibonacci Number", "EASY", "Find the nth Fibonacci number, with `F(0)=0` and `F(1)=1`.", "An integer `n` where `0 ≤ n ≤ 45`.", "`F(n)`.", ["math", "dynamic-programming"], ["7", "13"], ["0", "0"], ["10", "55"]),
  q("reverse-a-line", "Reverse a Line", "EASY", "Reverse every character in the given line.", "One line of printable text.", "The reversed line.", ["string"], ["code forge", "egrof edoc"], ["abc", "cba"], ["level", "level"]),
  q("palindrome-check", "Palindrome Check", "EASY", "Check whether a lowercase string reads the same forwards and backwards.", "One lowercase string `s`.", "Print `YES` or `NO`.", ["string", "two-pointers"], ["racecar", "YES"], ["coding", "NO"], ["a", "YES"]),
  q("count-vowels", "Count Vowels", "EASY", "Count English vowels in a case-sensitive text; both cases count.", "One line of text.", "The number of vowels.", ["string"], ["CodeForge", "4"], ["rhythms", "0"], ["AEIOU", "5"]),
  q("sum-of-array", "Sum of an Array", "EASY", "Find the sum of all array elements.", "`n`, followed by `n` integers.", "The array sum.", ["array"], ["5\n1 2 3 4 5", "15"], ["4\n-2 7 0 -1", "4"], ["1\n99", "99"]),
  q("largest-array-element", "Largest Array Element", "EASY", "Find the largest value in a non-empty array.", "`n`, followed by `n` integers.", "The largest value.", ["array"], ["5\n2 9 1 8 3", "9"], ["3\n-8 -2 -5", "-2"], ["1\n42", "42"]),
  q("count-positive-values", "Count Positive Values", "EASY", "Count how many array elements are strictly positive.", "`n`, followed by `n` integers.", "The count.", ["array"], ["6\n-1 2 0 5 -3 4", "3"], ["4\n-1 -2 -3 0", "0"], ["3\n1 2 3", "3"]),
  q("linear-search-index", "Linear Search Index", "EASY", "Find the first zero-based index of a target in an array.", "`n`, the array, then target `x`.", "The first index, or `-1`.", ["array", "searching"], ["5\n4 7 2 7 9\n7", "1"], ["3\n1 2 3\n8", "-1"], ["1\n6\n6", "0"]),
  q("is-array-sorted", "Is the Array Sorted?", "EASY", "Check whether an array is in non-decreasing order.", "`n`, followed by `n` integers.", "Print `YES` or `NO`.", ["array"], ["5\n1 2 2 4 9", "YES"], ["4\n1 3 2 4", "NO"], ["1\n7", "YES"]),
  q("distinct-sorted-count", "Distinct Values in Sorted Array", "EASY", "Count distinct values in a sorted array.", "`n`, followed by `n` sorted integers.", "The number of distinct values.", ["array", "two-pointers"], ["7\n1 1 2 2 2 5 8", "4"], ["4\n3 3 3 3", "1"], ["5\n1 2 3 4 5", "5"]),
  q("missing-number-one-to-n", "Missing Number from 1 to N", "EASY", "One number from `1..n` is missing. Find it.", "`n`, followed by `n-1` distinct integers.", "The missing number.", ["array", "math"], ["5\n1 2 4 5", "3"], ["2\n2", "1"], ["6\n1 3 4 5 6", "2"]),
  q("target-frequency", "Target Frequency", "EASY", "Count occurrences of a target value.", "`n`, the array, then target `x`.", "The frequency of `x`.", ["array", "hash-map"], ["6\n2 4 2 5 2 1\n2", "3"], ["3\n1 2 3\n8", "0"], ["4\n7 7 7 7\n7", "4"]),
  q("greatest-common-divisor", "Greatest Common Divisor", "EASY", "Compute the greatest common divisor of two non-negative integers.", "Two integers `a b`, not both zero.", "Their GCD.", ["math"], ["48 18", "6"], ["0 7", "7"], ["17 13", "1"]),
  q("leap-year", "Leap Year", "EASY", "Determine whether a Gregorian calendar year is a leap year.", "One integer `year`.", "Print `YES` or `NO`.", ["math", "conditions"], ["2000", "YES"], ["1900", "NO"], ["2024", "YES"]),
  q("sum-of-digits", "Sum of Digits", "EASY", "Find the sum of the decimal digits of a non-negative integer.", "One integer `n`.", "The digit sum.", ["math"], ["50821", "16"], ["0", "0"], ["9999", "36"]),
  q("prime-number-check", "Prime Number Check", "EASY", "Determine whether an integer is prime.", "One integer `n` where `0 ≤ n ≤ 10^9`.", "Print `YES` or `NO`.", ["math"], ["29", "YES"], ["1", "NO"], ["100", "NO"]),

  // MEDIUM (20)
  q("binary-search-position", "Binary Search Position", "MEDIUM", "Find a target in a sorted array.", "`n`, sorted array, then target `x`.", "Its zero-based index, or `-1`.", ["array", "binary-search"], ["6\n1 3 5 7 9 11\n7", "3"], ["4\n2 4 6 8\n5", "-1"], ["1\n10\n10", "0"]),
  q("rotate-array-right", "Rotate Array Right", "MEDIUM", "Rotate an array right by `k` positions.", "`n k`, followed by `n` integers.", "The rotated array, space-separated.", ["array"], ["5 2\n1 2 3 4 5", "4 5 1 2 3"], ["4 6\n1 2 3 4", "3 4 1 2"], ["1 99\n7", "7"]),
  q("maximum-subarray-sum", "Maximum Subarray Sum", "MEDIUM", "Find the maximum sum of a non-empty contiguous subarray.", "`n`, followed by `n` integers.", "The maximum sum.", ["array", "dynamic-programming"], ["9\n-2 1 -3 4 -1 2 1 -5 4", "6"], ["3\n-5 -2 -8", "-2"], ["5\n1 2 3 4 5", "15"]),
  q("product-except-self", "Product Except Self", "MEDIUM", "For each position, output the product of all other elements without division.", "`n`, followed by `n` integers.", "`n` space-separated products.", ["array", "prefix-sum"], ["4\n1 2 3 4", "24 12 8 6"], ["4\n0 2 3 4", "24 0 0 0"], ["3\n-1 2 -3", "-6 3 -2"]),
  q("valid-bracket-sequence", "Valid Bracket Sequence", "MEDIUM", "Check whether `()[]{}` brackets are correctly nested.", "One bracket string.", "Print `YES` or `NO`.", ["string", "stack"], ["{[()]}", "YES"], ["([)]", "NO"], ["", "YES"]),
  q("anagram-check", "Anagram Check", "MEDIUM", "Check whether two lowercase strings contain the same characters with the same frequencies.", "Two whitespace-separated strings.", "Print `YES` or `NO`.", ["string", "hash-map"], ["listen silent", "YES"], ["apple paper", "NO"], ["a a", "YES"]),
  q("longest-common-prefix", "Longest Common Prefix", "MEDIUM", "Find the longest prefix shared by every string.", "`n`, followed by `n` lowercase strings.", "The prefix, or `EMPTY` if none.", ["string"], ["3\nflower flow flight", "fl"], ["3\ndog racecar car", "EMPTY"], ["2\nsame same", "same"]),
  q("matrix-transpose", "Matrix Transpose", "MEDIUM", "Transpose a matrix.", "`r c`, then `r` rows of `c` integers.", "The `c × r` transpose, one row per line.", ["matrix"], ["2 3\n1 2 3\n4 5 6", "1 4\n2 5\n3 6"], ["1 3\n7 8 9", "7\n8\n9"], ["2 2\n1 0\n0 1", "1 0\n0 1"]),
  q("spiral-matrix-order", "Spiral Matrix Order", "MEDIUM", "Print matrix elements in clockwise spiral order.", "`r c`, then the matrix.", "Elements in spiral order, space-separated.", ["matrix"], ["3 3\n1 2 3\n4 5 6\n7 8 9", "1 2 3 6 9 8 7 4 5"], ["2 3\n1 2 3\n4 5 6", "1 2 3 6 5 4"], ["1 2\n8 9", "8 9"]),
  q("merge-overlapping-intervals", "Merge Overlapping Intervals", "MEDIUM", "Merge all overlapping closed intervals.", "`n`, then `n` lines `start end`.", "Merged intervals sorted by start, one per line.", ["sorting", "intervals"], ["4\n1 3\n2 6\n8 10\n15 18", "1 6\n8 10\n15 18"], ["2\n1 4\n4 5", "1 5"], ["3\n5 7\n1 2\n3 4", "1 2\n3 4\n5 7"]),
  q("minimum-coin-change", "Minimum Coin Change", "MEDIUM", "Find the minimum coins needed to form an amount using unlimited copies.", "`n amount`, followed by `n` positive coin values.", "Minimum coin count, or `-1`.", ["dynamic-programming"], ["3 11\n1 2 5", "3"], ["1 3\n2", "-1"], ["2 0\n2 5", "0"]),
  q("climbing-stairs-ways", "Climbing Stairs", "MEDIUM", "Count ways to reach stair `n` using steps of size 1 or 2.", "An integer `n` where `1 ≤ n ≤ 45`.", "The number of ways.", ["dynamic-programming"], ["5", "8"], ["1", "1"], ["10", "89"]),
  q("unique-grid-paths", "Unique Grid Paths", "MEDIUM", "Count paths from the top-left to bottom-right of an `m × n` grid using only right and down moves.", "Two integers `m n`.", "The path count.", ["dynamic-programming", "matrix"], ["3 7", "28"], ["1 5", "1"], ["3 3", "6"]),
  q("longest-unique-substring", "Longest Unique Substring", "MEDIUM", "Find the length of the longest substring without repeated characters.", "One string `s`.", "The maximum length.", ["string", "sliding-window"], ["abcabcbb", "3"], ["bbbbb", "1"], ["pwwkew", "3"]),
  q("subarray-sum-k", "Subarray Sum Equals K", "MEDIUM", "Count contiguous subarrays whose sum equals `k`.", "`n k`, followed by `n` integers.", "The number of matching subarrays.", ["array", "prefix-sum", "hash-map"], ["3 2\n1 1 1", "2"], ["3 3\n1 2 3", "2"], ["3 0\n0 0 0", "6"]),
  q("majority-element", "Majority Element", "MEDIUM", "Find the value appearing more than `n/2` times. It is guaranteed to exist.", "`n`, followed by `n` integers.", "The majority value.", ["array"], ["7\n2 2 1 1 1 2 2", "2"], ["1\n5", "5"], ["5\n-1 -1 3 -1 2", "-1"]),
  q("next-greater-elements", "Next Greater Elements", "MEDIUM", "For every element, find the first greater value to its right.", "`n`, followed by `n` integers.", "The answers, using `-1` when absent.", ["array", "stack"], ["4\n4 5 2 10", "5 10 10 -1"], ["3\n3 2 1", "-1 -1 -1"], ["5\n1 3 2 4 1", "3 4 4 -1 -1"]),
  q("sort-zero-one-two", "Sort 0s, 1s and 2s", "MEDIUM", "Sort an array containing only 0, 1 and 2 in linear time.", "`n`, followed by the array.", "The sorted array.", ["array", "two-pointers"], ["6\n2 0 2 1 1 0", "0 0 1 1 2 2"], ["3\n2 2 0", "0 2 2"], ["1\n1", "1"]),
  q("kth-largest-element", "Kth Largest Element", "MEDIUM", "Find the kth largest array element, counting duplicates.", "`n k`, followed by `n` integers.", "The kth largest value.", ["array", "heap"], ["6 2\n3 2 1 5 6 4", "5"], ["9 4\n3 2 3 1 2 4 5 5 6", "4"], ["1 1\n8", "8"]),
  q("prefix-range-sums", "Prefix Range Sums", "MEDIUM", "Answer inclusive range-sum queries on a fixed array.", "`n q`, array, then `q` lines `l r` using zero-based indices.", "One sum per line.", ["array", "prefix-sum"], ["5 3\n2 4 1 7 3\n0 2\n1 3\n4 4", "7\n12\n3"], ["3 2\n-1 5 2\n0 0\n0 2", "-1\n6"], ["1 1\n9\n0 0", "9"]),

  // HARD (20)
  q("count-array-inversions", "Count Array Inversions", "HARD", "Count pairs `(i,j)` where `i<j` and `a[i]>a[j]`.", "`n`, followed by `n` integers.", "The inversion count.", ["array", "divide-and-conquer"], ["5\n2 4 1 3 5", "3"], ["5\n5 4 3 2 1", "10"], ["4\n1 2 3 4", "0"]),
  q("trapping-rain-water", "Trapping Rain Water", "HARD", "Given bar heights of unit width, compute trapped rain water.", "`n`, followed by non-negative heights.", "Total trapped units.", ["array", "two-pointers"], ["12\n0 1 0 2 1 0 1 3 2 1 2 1", "6"], ["6\n4 2 0 3 2 5", "9"], ["3\n1 2 3", "0"]),
  q("largest-histogram-rectangle", "Largest Histogram Rectangle", "HARD", "Find the largest rectangle area in a histogram.", "`n`, followed by bar heights.", "The maximum area.", ["stack", "array"], ["6\n2 1 5 6 2 3", "10"], ["2\n2 4", "4"], ["4\n1 1 1 1", "4"]),
  q("minimum-window-substring", "Minimum Window Substring", "HARD", "Find the shortest substring of `s` containing every character of `t` with multiplicity.", "Two strings `s t`.", "The window, or `EMPTY`.", ["string", "sliding-window"], ["ADOBECODEBANC ABC", "BANC"], ["a aa", "EMPTY"], ["aa a", "a"]),
  q("edit-distance", "Edit Distance", "HARD", "Find the minimum insertions, deletions and replacements needed to turn one string into another.", "Two strings `a b`.", "The minimum operation count.", ["string", "dynamic-programming"], ["horse ros", "3"], ["intention execution", "5"], ["abc abc", "0"]),
  q("longest-common-subsequence", "Longest Common Subsequence", "HARD", "Find the length of the longest subsequence common to two strings.", "Two strings `a b`.", "The LCS length.", ["string", "dynamic-programming"], ["abcde ace", "3"], ["abc def", "0"], ["abc abc", "3"]),
  q("longest-increasing-subsequence", "Longest Increasing Subsequence", "HARD", "Find the length of the longest strictly increasing subsequence.", "`n`, followed by `n` integers.", "The LIS length.", ["array", "binary-search", "dynamic-programming"], ["8\n10 9 2 5 3 7 101 18", "4"], ["6\n0 1 0 3 2 3", "4"], ["4\n7 7 7 7", "1"]),
  q("zero-one-knapsack", "0/1 Knapsack", "HARD", "Maximize value with capacity `W`; every item may be used at most once.", "`n W`, then weights, then values.", "The maximum total value.", ["dynamic-programming"], ["3 50\n10 20 30\n60 100 120", "220"], ["3 4\n4 5 1\n1 2 3", "3"], ["2 3\n2 3\n4 5", "5"]),
  q("matrix-chain-cost", "Matrix Chain Multiplication", "HARD", "Find the minimum scalar multiplications needed for a matrix chain.", "`n`, followed by `n+1` dimensions; matrix `i` is `d[i-1]×d[i]`.", "The minimum cost.", ["dynamic-programming"], ["4\n40 20 30 10 30", "26000"], ["2\n10 20 30", "6000"], ["3\n10 30 5 60", "4500"]),
  q("n-queens-count", "N-Queens Count", "HARD", "Count arrangements of `n` queens where none attack another.", "One integer `n` where `1 ≤ n ≤ 12`.", "The arrangement count.", ["backtracking"], ["4", "2"], ["1", "1"], ["5", "10"]),
  q("word-break", "Word Break", "HARD", "Determine whether a string can be segmented into dictionary words, reusable as needed.", "String `s`, integer `m`, then `m` words.", "Print `YES` or `NO`.", ["string", "dynamic-programming"], ["leetcode\n2\nleet code", "YES"], ["catsandog\n5\ncats dog sand and cat", "NO"], ["applepenapple\n2\napple pen", "YES"]),
  q("wildcard-matching", "Wildcard Matching", "HARD", "Match a string against a pattern where `?` matches one character and `*` matches any sequence.", "String `s`, then pattern `p`.", "Print `YES` or `NO` for a full match.", ["string", "dynamic-programming"], ["adceb\n*a*b", "YES"], ["acdcb\na*c?b", "NO"], ["aa\n*", "YES"]),
  q("regex-dot-star", "Regular Expression Matching", "HARD", "Match a string against a pattern using `.` and `*`, where `*` repeats the preceding element.", "String `s`, then pattern `p`.", "Print `YES` or `NO` for a full match.", ["string", "dynamic-programming"], ["aab\nc*a*b", "YES"], ["mississippi\nmis*is*p*.", "NO"], ["ab\n.*", "YES"]),
  q("median-two-sorted-arrays", "Median of Two Sorted Arrays", "HARD", "Find the median of two sorted integer arrays.", "`n m`, first array, then second array. At least one is non-empty.", "The median; print halves with `.5`, otherwise an integer.", ["array", "binary-search"], ["2 1\n1 3\n2", "2"], ["2 2\n1 2\n3 4", "2.5"], ["0 1\n\n7", "7"]),
  q("strongly-connected-components", "Strongly Connected Components", "HARD", "Count strongly connected components in a directed graph.", "`n m`, followed by `m` directed edges `u v`, vertices `0..n-1`.", "The SCC count.", ["graph", "depth-first-search"], ["5 5\n0 1\n1 2\n2 0\n1 3\n3 4", "3"], ["3 3\n0 1\n1 2\n2 0", "1"], ["4 0", "4"]),
  q("dynamic-range-sum", "Dynamic Range Sum", "HARD", "Process point updates and inclusive range-sum queries.", "`n q`, array, then commands `SET i x` or `SUM l r`.", "One line per `SUM` command.", ["segment-tree", "fenwick-tree"], ["5 4\n1 2 3 4 5\nSUM 1 3\nSET 2 10\nSUM 1 3\nSUM 0 4", "9\n16\n22"], ["3 3\n0 0 0\nSET 1 5\nSUM 0 2\nSUM 1 1", "5\n5"], ["1 1\n7\nSUM 0 0", "7"]),
  q("dynamic-connectivity", "Dynamic Connectivity", "HARD", "Add undirected edges and report the number of connected components after each addition.", "`n m`, followed by `m` edges `u v`.", "Component count after every edge, one per line.", ["graph", "disjoint-set"], ["5 4\n0 1\n1 2\n3 4\n2 4", "4\n3\n2\n1"], ["3 3\n0 1\n0 1\n1 2", "2\n2\n1"], ["2 1\n0 1", "1"]),
  q("shortest-obstacle-grid-path", "Shortest Obstacle Grid Path", "HARD", "Find the shortest path from top-left to bottom-right through cells marked `0`; `1` cells are blocked.", "`r c`, then the binary grid.", "Number of moves, or `-1`.", ["graph", "breadth-first-search", "matrix"], ["3 4\n0 0 1 0\n1 0 0 0\n1 1 0 0", "5"], ["2 2\n0 1\n1 0", "-1"], ["1 1\n0", "0"]),
  q("minimum-palindrome-cuts", "Minimum Palindrome Cuts", "HARD", "Find the minimum cuts needed to partition a string into palindromes.", "One lowercase string `s`.", "The minimum cut count.", ["string", "dynamic-programming"], ["aab", "1"], ["a", "0"], ["abccbc", "2"]),
  q("largest-binary-matrix-rectangle", "Largest Binary Matrix Rectangle", "HARD", "Find the largest all-1 rectangle in a binary matrix.", "`r c`, then `r` rows of `c` values.", "The maximum area.", ["matrix", "stack", "dynamic-programming"], ["4 5\n1 0 1 0 0\n1 0 1 1 1\n1 1 1 1 1\n1 0 0 1 0", "6"], ["2 2\n0 0\n0 0", "0"], ["2 3\n1 1 1\n1 1 1", "6"]),
];

async function main() {
  for (const question of questions) {
    await prisma.$transaction(async (tx) => {
      const problem = await tx.problem.upsert({
        where: { slug: question.slug },
        update: {
          title: question.title,
          difficulty: question.difficulty,
          statementMd: `${question.prompt}\n\n### Input format\n${question.input}\n\n### Output format\n${question.output}`,
          constraintsMd: "Inputs follow the stated format. Use 64-bit integers where sums or counts may grow large.",
          starterCode,
          status: "PUBLISHED",
          kind: "QUESTION",
          challengeEndsAt: null,
          publishAfterChallenge: false,
          tags: {
            set: [],
            connectOrCreate: question.tags.map((name) => ({ where: { name }, create: { name } })),
          },
        },
        create: {
          slug: question.slug,
          title: question.title,
          difficulty: question.difficulty,
          statementMd: `${question.prompt}\n\n### Input format\n${question.input}\n\n### Output format\n${question.output}`,
          constraintsMd: "Inputs follow the stated format. Use 64-bit integers where sums or counts may grow large.",
          starterCode,
          status: "PUBLISHED",
          kind: "QUESTION",
          tags: {
            connectOrCreate: question.tags.map((name) => ({ where: { name }, create: { name } })),
          },
        },
      });

      const allCases = [question.example, ...question.tests];
      await tx.problemExample.upsert({
        where: { problemId_position: { problemId: problem.id, position: 0 } },
        update: { inputText: question.example[0], outputText: question.example[1] },
        create: { problemId: problem.id, position: 0, inputText: question.example[0], outputText: question.example[1] },
      });
      for (const [position, [input, output]] of allCases.entries()) {
        await tx.testCase.upsert({
          where: { problemId_position: { problemId: problem.id, position } },
          update: {
            visibility: position === 0 ? "PUBLIC" : "HIDDEN",
            inputKey: createInlineContentKey(input),
            expectedOutputKey: createInlineContentKey(output),
            points: position === 0 ? 20 : 40,
            groupId: position === 0 ? "example" : "correctness",
          },
          create: {
            problemId: problem.id,
            position,
            visibility: position === 0 ? "PUBLIC" : "HIDDEN",
            inputKey: createInlineContentKey(input),
            expectedOutputKey: createInlineContentKey(output),
            points: position === 0 ? 20 : 40,
            groupId: position === 0 ? "example" : "correctness",
          },
        });
      }
    });
  }

  const counts = await prisma.problem.groupBy({
    by: ["difficulty"],
    where: { slug: { in: questions.map(({ slug }) => slug) } },
    _count: { _all: true },
  });
  console.log(`Seeded ${questions.length} catalog questions.`, counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

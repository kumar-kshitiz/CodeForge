import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Puzzle = {
  prompt: string;
  options?: string[];
  correctOption?: number;
  answerText?: string;
  explanation: string;
};

const puzzles: Puzzle[] = [
  { prompt: "What comes next: 2, 4, 8, 16, ?", options: ["24", "30", "32", "34"], correctOption: 2, explanation: "Each number is doubled." },
  { prompt: "Complete the sequence: 1, 1, 2, 3, 5, ?", options: ["6", "7", "8", "10"], correctOption: 2, explanation: "Each term is the sum of the previous two." },
  { prompt: "Which number does not belong: 2, 3, 5, 9, 11?", options: ["2", "5", "9", "11"], correctOption: 2, explanation: "Nine is the only composite number." },
  { prompt: "What is the smaller angle between the clock hands at 3:00?", options: ["45°", "60°", "90°", "120°"], correctOption: 2, explanation: "The hands are three hour marks apart, and each mark spans 30 degrees." },
  { prompt: "What is 15% of 200?", options: ["15", "20", "30", "35"], correctOption: 2, explanation: "0.15 multiplied by 200 equals 30." },
  { prompt: "What letter comes next: A, C, F, J, ?", options: ["M", "N", "O", "P"], correctOption: 2, explanation: "The jumps increase by one: +2, +3, +4, then +5." },
  { prompt: "All Bloops are Razzies, and all Razzies are Lazzies. Are all Bloops Lazzies?", options: ["Yes", "No", "Cannot be determined"], correctOption: 0, explanation: "The relationship is transitive." },
  { prompt: "Five machines make five items in five minutes. How long do 100 machines take to make 100 items?", options: ["5 minutes", "20 minutes", "100 minutes", "500 minutes"], correctOption: 0, explanation: "Each machine makes one item in five minutes." },
  { prompt: "What is binary 1010 in decimal?", options: ["8", "9", "10", "12"], correctOption: 2, explanation: "1010₂ equals 8 + 2." },
  { prompt: "Reverse the string CODE.", options: ["EDOC", "DOCE", "ECOD", "OCED"], correctOption: 0, explanation: "Reading the characters from right to left gives EDOC." },
  { prompt: "How many days are there in exactly three weeks?", options: ["18", "20", "21", "24"], correctOption: 2, explanation: "Three multiplied by seven is 21." },
  { prompt: "A square has side length 7. What is its perimeter?", options: ["14", "28", "42", "49"], correctOption: 1, explanation: "A square's perimeter is four times its side length." },
  { prompt: "Evaluate: 7 × 8 − 6.", options: ["42", "48", "50", "56"], correctOption: 2, explanation: "Multiplication comes first: 56 minus 6 is 50." },
  { prompt: "What comes next: 3, 6, 12, 24, ?", options: ["30", "36", "42", "48"], correctOption: 3, explanation: "Each value is twice the previous value." },
  { prompt: "What is the position of M in the English alphabet?", options: ["12", "13", "14", "15"], correctOption: 1, explanation: "M is the thirteenth letter." },
  { prompt: "What is the average of 4, 8, and 12?", options: ["6", "8", "9", "10"], correctOption: 1, explanation: "Their sum is 24; dividing by three gives 8." },
  { prompt: "Which of these numbers is prime?", options: ["21", "29", "39", "51"], correctOption: 1, explanation: "Twenty-nine has no positive divisors other than 1 and 29." },
  { prompt: "What is 2 raised to the power 5?", options: ["10", "16", "25", "32"], correctOption: 3, explanation: "2 × 2 × 2 × 2 × 2 equals 32." },
  { prompt: "A train travels 120 km in 2 hours. What is its average speed?", options: ["40 km/h", "60 km/h", "80 km/h", "120 km/h"], correctOption: 1, explanation: "Speed is distance divided by time: 120 ÷ 2." },
  { prompt: "What is the remainder when 29 is divided by 5?", options: ["2", "3", "4", "5"], correctOption: 2, explanation: "29 equals 5 × 5 plus 4." },
  { prompt: "Which data structure follows Last In, First Out?", options: ["Queue", "Stack", "Heap", "Graph"], correctOption: 1, explanation: "A stack removes the most recently added item first." },
  { prompt: "Which data structure follows First In, First Out?", options: ["Queue", "Stack", "Tree", "Set"], correctOption: 0, explanation: "A queue removes the earliest added item first." },
  { prompt: "What is the worst-case time complexity of binary search?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], correctOption: 1, explanation: "Binary search halves the search space at every step." },
  { prompt: "What does 5 % 2 evaluate to in most programming languages?", options: ["0", "1", "2", "2.5"], correctOption: 1, explanation: "The modulo operator returns the remainder." },
  { prompt: "How many times does this loop run: for (let i = 0; i < 5; i++)?", options: ["4", "5", "6", "Infinite"], correctOption: 1, explanation: "It runs for i values 0 through 4." },
  { prompt: "Which Boolean expression is true?", options: ["true && false", "false || true", "!true", "false && false"], correctOption: 1, explanation: "An OR expression is true when at least one operand is true." },
  { prompt: "What index contains the first element of a typical zero-indexed array?", options: ["-1", "0", "1", "Depends on its length"], correctOption: 1, explanation: "Zero-indexed arrays begin at index 0." },
  { prompt: "Which sorting algorithm has O(n log n) average-case complexity?", options: ["Bubble sort", "Insertion sort", "Merge sort", "Selection sort"], correctOption: 2, explanation: "Merge sort runs in O(n log n) in average and worst cases." },
  { prompt: "What is the result of true XOR true?", options: ["true", "false", "undefined", "1"], correctOption: 1, explanation: "XOR is true only when its inputs differ." },
  { prompt: "A complete binary tree node can have at most how many children?", options: ["1", "2", "3", "Unlimited"], correctOption: 1, explanation: "Every node in a binary tree has at most two children." },
  { prompt: "Find the missing number: 1, 4, 9, 16, ?, 36.", options: ["20", "24", "25", "30"], correctOption: 2, explanation: "These are consecutive perfect squares." },
  { prompt: "If yesterday was Monday, what day is tomorrow?", options: ["Monday", "Tuesday", "Wednesday", "Thursday"], correctOption: 2, explanation: "Today is Tuesday, so tomorrow is Wednesday." },
  { prompt: "A bag has 3 red and 2 blue balls. What is the probability of drawing a blue ball?", options: ["1/5", "2/5", "1/2", "3/5"], correctOption: 1, explanation: "Two of the five balls are blue." },
  { prompt: "Which value completes the pattern: 10, 9, 7, 4, ?", options: ["0", "1", "2", "3"], correctOption: 0, explanation: "Subtract 1, then 2, then 3, then 4." },
  { prompt: "How many edges does a triangle have?", options: ["2", "3", "4", "6"], correctOption: 1, explanation: "A triangle has three sides or edges." },
  { prompt: "What is the hexadecimal representation of decimal 15?", options: ["E", "F", "10", "15"], correctOption: 1, explanation: "Hexadecimal digits use F to represent decimal 15." },
  { prompt: "If a function calls itself, what technique is it using?", options: ["Iteration", "Recursion", "Compilation", "Hashing"], correctOption: 1, explanation: "A self-calling function is recursive." },
  { prompt: "What is the next power of two after 64?", options: ["96", "100", "128", "256"], correctOption: 2, explanation: "Doubling 64 gives the next power of two, 128." },
  { prompt: "How many unique pairs can be formed from four people?", options: ["4", "6", "8", "12"], correctOption: 1, explanation: "The combination 4 choose 2 equals 6." },
  { prompt: "What word is produced by sorting the letters in CARE alphabetically?", answerText: "ACER", explanation: "In alphabetical order the letters are A, C, E, R." },
];

async function main() {
  const prompts = puzzles.map((puzzle) => puzzle.prompt);
  const existing = await prisma.abilityPuzzle.findMany({
    where: { prompt: { in: prompts } },
    select: { prompt: true },
  });
  const existingPrompts = new Set(existing.map((puzzle) => puzzle.prompt));
  const missing = puzzles.filter((puzzle) => !existingPrompts.has(puzzle.prompt));

  for (const puzzle of missing) {
    await prisma.abilityPuzzle.create({
      data: {
        ...puzzle,
        status: "ACTIVE",
      },
    });
  }

  console.log(`Ability puzzles ready: ${puzzles.length} (${missing.length} inserted, ${existing.length} already present).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

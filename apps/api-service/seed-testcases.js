const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const problemId = 'cmphaoiwp0000lxbav8ynmfud';

  // Clear existing test cases for this problem
  await prisma.testCase.deleteMany({
    where: { problemId }
  });

  // Seed standard I/O test cases
  await prisma.testCase.create({
    data: {
      problemId,
      input: "4\n2 7 11 15\n9",
      expectedOutput: "0 1",
      isHidden: false,
      order: 1
    }
  });

  await prisma.testCase.create({
    data: {
      problemId,
      input: "3\n3 2 4\n6",
      expectedOutput: "1 2",
      isHidden: false,
      order: 2
    }
  });

  await prisma.testCase.create({
    data: {
      problemId,
      input: "2\n3 3\n6",
      expectedOutput: "0 1",
      isHidden: true,
      order: 3
    }
  });

  console.log("Seeded 3 test cases successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

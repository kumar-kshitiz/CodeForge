import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.user.count();
  console.log("Total users:", count);
  const users = await prisma.user.findMany();
  console.log("Users:", users);
}
main().finally(() => prisma.$disconnect());

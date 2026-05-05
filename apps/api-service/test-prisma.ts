import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }
  
  try {
    const room = await prisma.interviewRoom.create({
      data: {
        title: "Test Room",
        createdBy: user.id,
      },
      include: { host: { select: { id: true, username: true, email: true } } },
    });
    console.log("Room created successfully:", room);
  } catch (err) {
    console.error("Failed to create room:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

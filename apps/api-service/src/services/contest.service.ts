import { prisma } from '../prisma/client';

export async function listContests() {
  const now = new Date();
  const contests = await prisma.contest.findMany({
    orderBy: { startTime: 'desc' },
    include: {
      _count: { select: { participants: true } }
    }
  });

  return contests.map(c => ({
    ...c,
    status: c.endTime < now ? 'PAST' : c.startTime > now ? 'UPCOMING' : 'ACTIVE',
  }));
}

export async function getContest(id: string) {
  return prisma.contest.findUnique({
    where: { id },
    include: {
      problems: {
        include: {
          problem: {
            select: { slug: true, title: true, difficulty: true }
          }
        }
      },
      _count: { select: { participants: true } }
    }
  });
}

export async function joinContest(contestId: string, userId: string) {
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) throw new Error('Contest not found');

  return prisma.contestParticipant.upsert({
    where: { contestId_userId: { contestId, userId } },
    update: {},
    create: { contestId, userId },
  });
}

export async function getLeaderboard(contestId: string) {
  return prisma.contestParticipant.findMany({
    where: { contestId },
    orderBy: [
      { score: 'desc' },
      { penalty: 'asc' },
      { updatedAt: 'asc' }
    ],
    include: {
      user: { select: { username: true } }
    },
    take: 100 // Top 100
  });
}

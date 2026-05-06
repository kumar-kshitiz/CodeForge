import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';

export async function listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { roomId } = req.params;

    const sessions = await prisma.interviewSession.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { events: true }
        }
      }
    });

    res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

export async function getSessionTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId } = req.params;

    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const events = await prisma.sessionEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ session, events });
  } catch (err) {
    next(err);
  }
}

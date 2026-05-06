import { prisma } from '../prisma/client';

export class SessionRecordingService {
  /**
   * Ensure an active interview session exists for the room.
   * If a session doesn't exist or was ended, create a new one.
   */
  static async getOrCreateSession(roomId: string): Promise<string> {
    try {
      // Find the most recent session for this room
      let session = await prisma.interviewSession.findFirst({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
      });

      if (!session || session.endedAt) {
        session = await prisma.interviewSession.create({
          data: { roomId },
        });
      }

      return session.id;
    } catch (err) {
      console.error('[SessionRecordingService] Failed to getOrCreateSession:', err);
      return '';
    }
  }

  /**
   * Record a session event to the database asynchronously.
   * We do not await this in the main hot path to avoid blocking.
   */
  static recordEvent(
    roomId: string,
    eventType: string,
    userId: string,
    payload: any
  ): void {
    // Fire and forget
    (async () => {
      try {
        const sessionId = await this.getOrCreateSession(roomId);
        if (!sessionId) return;

        await prisma.sessionEvent.create({
          data: {
            sessionId,
            userId,
            eventType,
            payload,
          },
        });
      } catch (err) {
        console.error(`[SessionRecordingService] Failed to record event ${eventType}:`, err);
      }
    })();
  }
}

import Redis from 'ioredis';
import { Server } from 'socket.io';
import { env } from '../config/env';

export function initializeRedisSubscriber(io: Server) {
  const subscriber = new Redis(env.redisUrl);

  subscriber.subscribe('execution-updates', (err, count) => {
    if (err) {
      console.error('[redis] failed to subscribe:', err);
    } else {
      console.log(`[redis] subscribed to ${count} channels.`);
    }
  });

  subscriber.on('message', (channel, message) => {
    if (channel === 'execution-updates') {
      try {
        const { roomId, event, payload } = JSON.parse(message);
        if (roomId && event) {
          io.to(roomId).emit(event, payload);
          // Import inline to avoid circular dependencies if any, or just import at top
          const { SessionRecordingService } = require('../services/recording.service');
          SessionRecordingService.recordEvent(roomId, event, payload?.userId || 'system', payload);
        }
      } catch (err) {
        console.error('[redis] failed to parse message:', err);
      }
    }
  });

  subscriber.on('error', (err) => {
    console.error('[redis] subscriber error:', err);
  });
}

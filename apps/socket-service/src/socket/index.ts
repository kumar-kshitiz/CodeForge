import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware } from '../middleware/auth.middleware';
import { registerRoomHandlers } from '../handlers/room.handler';
import { registerCodeHandlers } from '../handlers/code.handler';
import { registerCursorHandlers } from '../handlers/cursor.handler';
import { initializeRedisSubscriber } from '../redis/subscriber';

export function registerSocketHandlers(io: Server): void {
  io.use(socketAuthMiddleware);

  initializeRedisSubscriber(io);

  io.on('connection', (socket: Socket) => {
    console.log(`[socket] connected: ${socket.data.username} (${socket.id})`);

    registerRoomHandlers(io, socket);
    registerCodeHandlers(socket);
    registerCursorHandlers(socket);
  });
}

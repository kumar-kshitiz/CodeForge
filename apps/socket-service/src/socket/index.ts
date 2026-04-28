import { Server, Socket } from 'socket.io';
import { SocketEvent } from '@codeforge/shared-types';

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on(SocketEvent.JOIN_ROOM, (roomId: string) => {
      socket.join(roomId);
      socket.to(roomId).emit(SocketEvent.USER_JOINED, { socketId: socket.id });
      console.log(`[socket] ${socket.id} joined room ${roomId}`);
    });

    socket.on(SocketEvent.LEAVE_ROOM, (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit(SocketEvent.USER_LEFT, { socketId: socket.id });
    });

    socket.on(SocketEvent.CODE_CHANGE, (payload: { roomId: string; code: string; language: string }) => {
      socket.to(payload.roomId).emit(SocketEvent.CODE_CHANGE, payload);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });
}

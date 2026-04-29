import { Socket } from 'socket.io';
import { SocketEvent, CursorPayload } from '@codeforge/shared-types';

export function registerCursorHandlers(socket: Socket): void {
  socket.on(SocketEvent.CURSOR_UPDATE, (payload: CursorPayload) => {
    socket.to(payload.roomId).emit(SocketEvent.CURSOR_UPDATE, payload);
  });
}

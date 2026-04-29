import { Socket } from 'socket.io';
import { SocketEvent, CodePayload, LangPayload } from '@codeforge/shared-types';
import { setRoomCode } from '../services/room.service';
import { scheduleAutosave } from '../services/autosave.service';

export function registerCodeHandlers(socket: Socket): void {
  socket.on(SocketEvent.CODE_CHANGE, async (payload: CodePayload) => {
    const { roomId, code, language } = payload;

    await setRoomCode(roomId, code, language);
    socket.to(roomId).emit(SocketEvent.CODE_UPDATE, { code, language });
    scheduleAutosave(roomId, code, language);
  });

  socket.on(SocketEvent.LANGUAGE_CHANGE, async (payload: LangPayload) => {
    const { roomId, language } = payload;

    await setRoomCode(roomId, '', language);
    socket.to(roomId).emit(SocketEvent.LANGUAGE_UPDATE, { language });
  });
}

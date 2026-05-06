import { Socket } from 'socket.io';
import { SocketEvent, CodePayload, LangPayload } from '@codeforge/shared-types';
import { setRoomCode, setRoomLanguage } from '../services/room.service';
import { SessionRecordingService } from '../services/recording.service';
import { scheduleAutosave } from '../services/autosave.service';

export function registerCodeHandlers(socket: Socket): void {
  socket.on(SocketEvent.CODE_CHANGE, async (payload: CodePayload) => {
    const { roomId, code, language } = payload;

    await setRoomCode(roomId, code, language);
    socket.to(roomId).emit(SocketEvent.CODE_UPDATE, { code, language });
    scheduleAutosave(roomId, code, language);

    SessionRecordingService.recordEvent(roomId, SocketEvent.CODE_CHANGE, socket.data.userId, { code, language });
  });

  socket.on(SocketEvent.LANGUAGE_CHANGE, async (payload: LangPayload) => {
    const { roomId, language } = payload;

    await setRoomLanguage(roomId, language);
    socket.to(roomId).emit(SocketEvent.LANGUAGE_UPDATE, { language });

    SessionRecordingService.recordEvent(roomId, SocketEvent.LANGUAGE_CHANGE, socket.data.userId, { language });
  });
}


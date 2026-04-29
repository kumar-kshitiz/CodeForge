import { Server, Socket } from 'socket.io';
import { SocketEvent, RoomUser } from '@codeforge/shared-types';
import { addUserToRoom, removeUserFromRoom, getRoomUsers, getRoomCode } from '../services/room.service';
import { cancelDebounce } from '../utils/debounce';

export function registerRoomHandlers(io: Server, socket: Socket): void {
  socket.on(SocketEvent.JOIN_ROOM, async (payload: { roomId: string }) => {
    const { roomId } = payload;
    const user: RoomUser = {
      socketId: socket.id,
      userId: socket.data.userId,
      username: socket.data.username,
    };

    await socket.join(roomId);
    await addUserToRoom(roomId, user);

    const participants = await getRoomUsers(roomId);
    const snapshot = await getRoomCode(roomId);

    socket.emit(SocketEvent.PARTICIPANTS, { participants });

    if (snapshot) {
      socket.emit(SocketEvent.ROOM_SNAPSHOT, snapshot);
    }

    socket.to(roomId).emit(SocketEvent.USER_JOINED, { user });
    socket.to(roomId).emit(SocketEvent.PARTICIPANTS, { participants });

    console.log(`[room] ${user.username} joined ${roomId}`);
  });

  socket.on(SocketEvent.LEAVE_ROOM, async (payload: { roomId: string }) => {
    const { roomId } = payload;
    await socket.leave(roomId);
    await removeUserFromRoom(roomId, socket.id);

    const participants = await getRoomUsers(roomId);
    socket.to(roomId).emit(SocketEvent.USER_LEFT, { socketId: socket.id, userId: socket.data.userId });
    socket.to(roomId).emit(SocketEvent.PARTICIPANTS, { participants });
  });

  socket.on('disconnect', async () => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    await Promise.all(
      rooms.map(async (roomId) => {
        await removeUserFromRoom(roomId, socket.id);
        cancelDebounce(`autosave:${roomId}`);
        const participants = await getRoomUsers(roomId);
        socket.to(roomId).emit(SocketEvent.USER_LEFT, { socketId: socket.id, userId: socket.data.userId });
        socket.to(roomId).emit(SocketEvent.PARTICIPANTS, { participants });
      })
    );
    console.log(`[socket] ${socket.data.username} disconnected`);
  });
}

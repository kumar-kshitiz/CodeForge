'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { SocketEvent } from '@codeforge/shared-types';
import type { RoomUser, CodePayload, LangPayload, CursorPayload } from '@codeforge/shared-types';
import { getSocket, disconnectSocket } from '../../../lib/socket';
import { useRoomStore } from '../../../store/roomStore';
import RoomHeader from '../../../components/room/RoomHeader';
import PresenceBar from '../../../components/room/PresenceBar';
import LanguageSelector from '../../../components/room/LanguageSelector';
import CodeEditor from '../../../components/editor/CodeEditor';

const EMIT_THROTTLE_MS = 80;

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;

  const [roomTitle, setRoomTitle] = useState('Interview Room');
  const [token] = useState(() => localStorage.getItem('accessToken') ?? '');
  const [username] = useState(() => localStorage.getItem('username') ?? 'Anonymous');

  const {
    code, language, participants,
    setCode, setLanguage, setParticipants, setConnected,
    addParticipant, removeParticipant, reset,
  } = useRoomStore();

  const lastEmitRef = useRef<number>(0);

  useEffect(() => {
    const socket = getSocket(token, username);

    socket.on('connect', () => {
      setConnected(true);
      socket.emit(SocketEvent.JOIN_ROOM, { roomId, userId: '', username });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on(SocketEvent.PARTICIPANTS, ({ participants }: { participants: RoomUser[] }) => {
      setParticipants(participants);
    });

    socket.on(SocketEvent.USER_JOINED, ({ user }: { user: RoomUser }) => {
      addParticipant(user);
    });

    socket.on(SocketEvent.USER_LEFT, ({ socketId }: { socketId: string }) => {
      removeParticipant(socketId);
    });

    socket.on(SocketEvent.CODE_UPDATE, ({ code: incoming, language: lang }: { code: string; language: string }) => {
      setCode(incoming);
      setLanguage(lang);
    });

    socket.on(SocketEvent.LANGUAGE_UPDATE, ({ language: lang }: { language: string }) => {
      setLanguage(lang);
    });

    socket.on(SocketEvent.ROOM_SNAPSHOT, ({ code: snap, language: lang }: { code: string; language: string }) => {
      setCode(snap);
      setLanguage(lang);
    });

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.room?.title) setRoomTitle(data.room.title);
      })
      .catch(() => null);

    return () => {
      socket.emit(SocketEvent.LEAVE_ROOM, { roomId });
      socket.off('connect');
      socket.off('disconnect');
      socket.off(SocketEvent.PARTICIPANTS);
      socket.off(SocketEvent.USER_JOINED);
      socket.off(SocketEvent.USER_LEFT);
      socket.off(SocketEvent.CODE_UPDATE);
      socket.off(SocketEvent.LANGUAGE_UPDATE);
      socket.off(SocketEvent.ROOM_SNAPSHOT);
      reset();
    };
  }, [roomId, token, username]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);

      const now = Date.now();
      if (now - lastEmitRef.current < EMIT_THROTTLE_MS) return;
      lastEmitRef.current = now;

      const socket = getSocket(token, username);
      const payload: CodePayload = { roomId, code: newCode, language };
      socket.emit(SocketEvent.CODE_CHANGE, payload);
    },
    [roomId, language, token, username, setCode]
  );

  const handleLanguageChange = useCallback(
    (lang: string) => {
      const socket = getSocket(token, username);
      const payload: LangPayload = { roomId, language: lang };
      socket.emit(SocketEvent.LANGUAGE_CHANGE, payload);
    },
    [roomId, token, username]
  );

  return (
    <div className="room-layout">
      <RoomHeader title={roomTitle} roomId={roomId} />
      <div className="room-toolbar">
        <LanguageSelector onLanguageChange={handleLanguageChange} />
        <PresenceBar />
      </div>
      <div className="room-editor">
        <CodeEditor value={code} language={language} onChange={handleCodeChange} />
      </div>
    </div>
  );
}

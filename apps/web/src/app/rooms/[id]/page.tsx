'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { SocketEvent } from '@codeforge/shared-types';
import type { RoomUser, CodePayload, LangPayload } from '@codeforge/shared-types';
import { getSocket } from '../../../lib/socket';
import { useRoomStore } from '../../../store/roomStore';
import RoomHeader from '../../../components/room/RoomHeader';
import PresenceBar from '../../../components/room/PresenceBar';
import LanguageSelector from '../../../components/room/LanguageSelector';
import CodeEditor from '../../../components/editor/CodeEditor';
import SubmitPanel from '../../../components/room/SubmitPanel';

const EMIT_THROTTLE_MS = 80;
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;

  const [roomTitle, setRoomTitle] = useState('Interview Room');
  const [credentials] = useState<{ token: string; username: string }>(() => ({
    token: typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '',
    username: typeof window !== 'undefined' ? (localStorage.getItem('username') ?? 'Anonymous') : 'Anonymous',
  }));

  const { token, username } = credentials;

  const {
    code, language,
    setCode, setLanguage, setParticipants, setConnected,
    addParticipant, removeParticipant, reset,
  } = useRoomStore();

  const lastEmitRef = useRef<number>(0);
  const languageRef = useRef(language);
  languageRef.current = language;

  useEffect(() => {
    const socket = getSocket(token, username);

    function onConnect() {
      setConnected(true);
      socket.emit(SocketEvent.JOIN_ROOM, { roomId, userId: '', username });
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onParticipants({ participants }: { participants: RoomUser[] }) {
      setParticipants(participants);
    }

    function onUserJoined({ user }: { user: RoomUser }) {
      addParticipant(user);
    }

    function onUserLeft({ socketId }: { socketId: string }) {
      removeParticipant(socketId);
    }

    function onCodeUpdate({ code: incoming, language: lang }: { code: string; language: string }) {
      setCode(incoming);
      setLanguage(lang);
    }

    function onLanguageUpdate({ language: lang }: { language: string }) {
      setLanguage(lang);
    }

    function onSnapshot({ code: snap, language: lang }: { code: string; language: string }) {
      setCode(snap);
      setLanguage(lang);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SocketEvent.PARTICIPANTS, onParticipants);
    socket.on(SocketEvent.USER_JOINED, onUserJoined);
    socket.on(SocketEvent.USER_LEFT, onUserLeft);
    socket.on(SocketEvent.CODE_UPDATE, onCodeUpdate);
    socket.on(SocketEvent.LANGUAGE_UPDATE, onLanguageUpdate);
    socket.on(SocketEvent.ROOM_SNAPSHOT, onSnapshot);

    if (socket.connected) {
      onConnect();
    }

    fetch(`${API}/api/rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.room?.title) setRoomTitle(data.room.title); })
      .catch(() => null);

    return () => {
      socket.emit(SocketEvent.LEAVE_ROOM, { roomId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SocketEvent.PARTICIPANTS, onParticipants);
      socket.off(SocketEvent.USER_JOINED, onUserJoined);
      socket.off(SocketEvent.USER_LEFT, onUserLeft);
      socket.off(SocketEvent.CODE_UPDATE, onCodeUpdate);
      socket.off(SocketEvent.LANGUAGE_UPDATE, onLanguageUpdate);
      socket.off(SocketEvent.ROOM_SNAPSHOT, onSnapshot);
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
      const payload: CodePayload = { roomId, code: newCode, language: languageRef.current };
      socket.emit(SocketEvent.CODE_CHANGE, payload);
    },
    [roomId, token, username, setCode]
  );

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      const socket = getSocket(token, username);
      const payload: LangPayload = { roomId, language: lang };
      socket.emit(SocketEvent.LANGUAGE_CHANGE, payload);
    },
    [roomId, token, username, setLanguage]
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
      <SubmitPanel code={code} language={language} />
    </div>
  );
}

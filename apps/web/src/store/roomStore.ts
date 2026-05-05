'use client';

import { create } from 'zustand';
import type { RoomUser } from '@codeforge/shared-types';

interface RoomState {
  roomId: string | null;
  participants: RoomUser[];
  code: string;
  language: string;
  connected: boolean;
  remoteCursors: Map<string, { line: number; column: number; username: string }>;

  setRoomId: (id: string | null) => void;
  setParticipants: (users: RoomUser[]) => void;
  setCode: (code: string) => void;
  setLanguage: (lang: string) => void;
  setConnected: (v: boolean) => void;
  addParticipant: (user: RoomUser) => void;
  removeParticipant: (socketId: string) => void;
  updateCursor: (socketId: string, data: { line: number; column: number; username: string }) => void;
  reset: () => void;
}

const defaults = {
  roomId: null,
  participants: [],
  code: '',
  language: 'javascript',
  connected: false,
  remoteCursors: new Map(),
};

export const useRoomStore = create<RoomState>((set) => ({
  ...defaults,

  setRoomId: (id) => set({ roomId: id }),
  setParticipants: (participants) => set({ participants }),
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setConnected: (connected) => set({ connected }),

  addParticipant: (user) =>
    set((s) => ({
      participants: s.participants.some((p) => p.socketId === user.socketId)
        ? s.participants
        : [...s.participants, user],
    })),

  removeParticipant: (socketId) =>
    set((s) => ({ participants: s.participants.filter((p) => p.socketId !== socketId) })),

  updateCursor: (socketId, data) =>
    set((s) => {
      const next = new Map(s.remoteCursors);
      next.set(socketId, data);
      return { remoteCursors: next };
    }),

  reset: () => set(defaults),
}));

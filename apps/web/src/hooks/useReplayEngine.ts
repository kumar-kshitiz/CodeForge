import { useState, useEffect, useRef, useCallback } from 'react';
import { SocketEvent } from '@codeforge/shared-types';

export interface SessionEvent {
  id: string;
  eventType: string;
  payload: any;
  createdAt: string;
}

export interface ReplayEngineState {
  code: string;
  language: string;
  participants: Map<string, any>; // socketId -> user
}

export function useReplayEngine(events: SessionEvent[], sessionStart: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0); // in ms relative to start
  
  const [replayState, setReplayState] = useState<ReplayEngineState>({
    code: '',
    language: 'javascript',
    participants: new Map(),
  });

  const duration = events.length > 0 
    ? new Date(events[events.length - 1].createdAt).getTime() - new Date(sessionStart).getTime()
    : 0;

  const lastUpdateRef = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);

  // Compute the state at a specific time offset
  const computeStateAtTime = useCallback((timeOffset: number) => {
    const newState: ReplayEngineState = {
      code: '',
      language: 'javascript',
      participants: new Map(),
    };

    const startTime = new Date(sessionStart).getTime();

    for (const event of events) {
      const eventTime = new Date(event.createdAt).getTime() - startTime;
      if (eventTime > timeOffset) break;

      switch (event.eventType) {
        case SocketEvent.CODE_CHANGE:
          newState.code = event.payload.code;
          if (event.payload.language) newState.language = event.payload.language;
          break;
        case SocketEvent.LANGUAGE_CHANGE:
          newState.language = event.payload.language;
          break;
        case SocketEvent.USER_JOINED:
          newState.participants.set(event.payload.user.socketId, event.payload.user);
          break;
        case SocketEvent.USER_LEFT:
          newState.participants.delete(event.payload.socketId);
          break;
      }
    }

    setReplayState(newState);
  }, [events, sessionStart]);

  // Scrub to a specific time
  const scrub = useCallback((timeOffset: number) => {
    const clamped = Math.max(0, Math.min(timeOffset, duration));
    setCurrentTime(clamped);
    computeStateAtTime(clamped);
  }, [duration, computeStateAtTime]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastUpdateRef.current = Date.now();

    const loop = () => {
      const now = Date.now();
      const delta = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      setCurrentTime((prev) => {
        const nextTime = prev + delta * playbackSpeed;
        if (nextTime >= duration) {
          setIsPlaying(false);
          computeStateAtTime(duration);
          return duration;
        }
        computeStateAtTime(nextTime);
        return nextTime;
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, playbackSpeed, duration, computeStateAtTime]);

  const togglePlay = () => setIsPlaying(p => !p);

  return {
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    currentTime,
    duration,
    scrub,
    replayState,
  };
}

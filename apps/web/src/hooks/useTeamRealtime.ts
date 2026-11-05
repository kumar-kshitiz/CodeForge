"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const TEAM_API = process.env.NEXT_PUBLIC_TEAM_COMPETITION_URL ?? "http://localhost:3002";

export function useTeamRealtime<T>(token: string | null, matchId: string | undefined,
  onMatch: (match: T | null) => void, onError: (message: string) => void,
  onLoaded?: () => void) {
  const callbacks = useRef({ onMatch, onError, onLoaded });
  useEffect(() => {
    callbacks.current = { onMatch, onError, onLoaded };
  }, [onMatch, onError, onLoaded]);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let busy = false;
    let pending = false;
    let lastRefresh = 0;
    const refresh = async () => {
      if (controller.signal.aborted) return;
      if (busy) { pending = true; return; }
      busy = true;
      try {
        const playerName = window.localStorage.getItem("username")?.trim();
        const response = await fetch(`${TEAM_API}/api/matches/${matchId ?? "mine"}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(playerName ? { "x-player-name": playerName } : {}),
          },
          signal: controller.signal,
        });
        if (response.status === 404 && matchId) {
          callbacks.current.onMatch(null);
          callbacks.current.onError("This squad has been destroyed or is no longer available.");
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not refresh squad");
        if (!controller.signal.aborted) callbacks.current.onMatch(data.match ?? null);
      } catch (error) {
        if (!controller.signal.aborted) callbacks.current.onError(error instanceof Error ? error.message : "Could not refresh squad");
      } finally {
        busy = false;
        lastRefresh = Date.now();
        if (!controller.signal.aborted) {
          callbacks.current.onLoaded?.();
          if (pending) { pending = false; void refresh(); }
        }
      }
    };
    const socket = io(TEAM_API, { transports: ["websocket"], auth: { token }, autoConnect: false });
    socket.on("connect", () => { void refresh(); });
    socket.on("match:changed", (event: { matchId: string }) => {
      if (!matchId || event.matchId === matchId) void refresh();
    });
    // Poll only during disconnection, plus a slow reconciliation for missed events.
    const timer = window.setInterval(() => {
      if (!socket.connected || Date.now() - lastRefresh >= 60000) void refresh();
    }, 15000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    socket.connect();
    void refresh();
    return () => {
      controller.abort();
      socket.disconnect();
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [token, matchId]);
}

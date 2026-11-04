import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./config/env";
import { getActiveMatchForUser, getMatch, onMatchChange } from "./store/match.store";
import { finishExpiredMatch } from "./services/match.service";

export function attachRealtime(server: HttpServer) {
  const io = new Server(server, {
    transports: ["websocket"],
    cors: { origin: env.frontendUrl },
    allowRequest: (request, done) => done(null, !request.headers.origin || request.headers.origin === env.frontendUrl),
    maxHttpBufferSize: 16384,
  });
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let closed = false;
  async function schedule(matchId: string) {
    const match = await getMatch(matchId);
    if (closed) return;
    const old = timers.get(matchId);
    if (old) clearTimeout(old);
    timers.delete(matchId);
    if (match?.status !== "LIVE" || !match.endsAt) return;
    const timer = setTimeout(() => {
      timers.delete(matchId);
      void finishExpiredMatch(matchId).catch(() => {
        if (!closed) {
          const retry = setTimeout(() => { void schedule(matchId).catch(console.error); }, 5000);
          retry.unref();
          timers.set(matchId, retry);
        }
      });
    }, Math.max(0, Date.parse(match.endsAt) - Date.now()));
    timer.unref();
    timers.set(matchId, timer);
  }
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (typeof token !== "string") throw new Error();
      const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
      if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.exp !== "number") throw new Error();
      socket.data.userId = payload.sub;
      socket.data.expiresAt = payload.exp * 1000;
      next();
    } catch { next(new Error("Invalid or expired access token")); }
  });
  io.on("connection", socket => {
    // Clients cannot choose rooms or broadcast game state.
    void socket.join(`user:${socket.data.userId}`);
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
    expiry.unref();
    socket.once("disconnect", () => clearTimeout(expiry));
    void getActiveMatchForUser(socket.data.userId).then(match => {
      if (match) return schedule(match.id);
    }).catch(() => console.error("[team-realtime] initial match lookup failed"));
  });
  const unsubscribe = onMatchChange(event => {
    // Send identifiers only; REST still authorizes every state fetch.
    io.to(event.userIds.map(id => `user:${id}`)).emit("match:changed", {
      matchId: event.matchId, deleted: event.deleted,
    });
    void schedule(event.matchId).catch(() => console.error("[team-realtime] scheduling failed"));
  });
  return async () => {
    closed = true;
    unsubscribe();
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    await new Promise<void>(resolve => io.close(() => resolve()));
  };
}

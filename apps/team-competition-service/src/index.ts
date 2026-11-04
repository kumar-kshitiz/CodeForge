/// <reference path="./types/express.d.ts" />
import http from "http";
import app from "./app";
import { env } from "./config/env";
import { closeStore, connectStore } from "./store/match.store";
import { attachRealtime } from "./realtime";

const server = http.createServer(app);
let closeRealtime: (() => Promise<void>) | undefined;

async function start(): Promise<void> {
  await connectStore();
  closeRealtime = attachRealtime(server);
  server.listen(env.port, () => {
    console.log(`[team-competition-service] listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("[team-competition-service] failed to start", error);
  process.exit(1);
});

async function stop() {
  await closeRealtime?.();
  await closeStore();
  process.exit(0);
}
process.once("SIGTERM", () => { void stop(); });
process.once("SIGINT", () => { void stop(); });

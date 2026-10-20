/// <reference path="./types/express.d.ts" />
import http from "http";
import app from "./app";
import { env } from "./config/env";
import { closeStore, connectStore } from "./store/match.store";

const server = http.createServer(app);

async function start(): Promise<void> {
  await connectStore();
  server.listen(env.port, () => {
    console.log(`[team-competition-service] listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("[team-competition-service] failed to start", error);
  process.exit(1);
});

process.on("SIGTERM", () => {
  server.close(async () => {
    await closeStore();
    process.exit(0);
  });
});

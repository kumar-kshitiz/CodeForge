import dotenv from "dotenv";
import path from "path";

dotenv.config();

// Local development shares the core API's JWT and Redis settings. Production
// supplies the same contracts directly to this independent service.
if (!process.env.JWT_ACCESS_SECRET && process.env.NODE_ENV !== "production") {
  const serviceOnlyKeys = [
    "PORT",
    "API_SERVICE_URL",
    "FRONTEND_URL",
    "MATCH_TTL_SECONDS",
  ] as const;
  const serviceOnlyValues = Object.fromEntries(
    serviceOnlyKeys.map((key) => [key, process.env[key]]),
  );
  const fromWorkspace = path.resolve(process.cwd(), "apps/api-service/.env");
  const fromService = path.resolve(process.cwd(), "../api-service/.env");
  dotenv.config({
    path: process.cwd().endsWith("team-competition-service")
      ? fromService
      : fromWorkspace,
  });
  serviceOnlyKeys.forEach((key) => {
    const original = serviceOnlyValues[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  });
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3002),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: required("JWT_ACCESS_SECRET"),
  apiServiceUrl: process.env.API_SERVICE_URL ?? "http://localhost:3004",
  internalServiceKey:
    process.env.INTERNAL_SERVICE_KEY ?? "execution-service-dev-key",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  matchTtlSeconds: Number(process.env.MATCH_TTL_SECONDS ?? 86400),
};

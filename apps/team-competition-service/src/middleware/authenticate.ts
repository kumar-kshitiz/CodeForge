import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface AccessTokenPayload {
  sub: string;
  email?: string;
  role?: string;
  username?: string;
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header missing or malformed" });
    return;
  }

  try {
    const payload = jwt.verify(
      header.slice("Bearer ".length),
      env.jwtSecret,
    ) as AccessTokenPayload;
    req.user = {
      id: payload.sub,
      username:
        req.header("x-player-name")?.trim() ||
        payload.username ||
        payload.email?.split("@")[0] ||
        "Player",
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
}

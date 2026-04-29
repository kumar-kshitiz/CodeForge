import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthSocket extends Socket {
  data: {
    userId: string;
    username: string;
  };
}

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error('Authentication token missing'));
  }

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as { sub: string; email: string };
    socket.data.userId = payload.sub;
    socket.data.username = socket.handshake.auth?.username ?? payload.email;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}

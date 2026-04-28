import { User } from '@prisma/client';
import { prisma } from '../prisma/client';
import { hashPassword, verifyPassword, hashToken } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken, JwtPayload } from '../utils/jwt';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { env } from '../config/env';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SafeUser = Omit<User, 'passwordHash'>;

function toSafeUser(user: User): SafeUser {
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}

function buildPayload(user: User): JwtPayload {
  return { sub: user.id, email: user.email, role: user.role };
}

async function issueTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = buildPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
  });

  if (existing) {
    const field = existing.email === input.email ? 'Email' : 'Username';
    throw Object.assign(new Error(`${field} is already taken`), { statusCode: 409 });
  }

  const user = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
  });

  const tokens = await issueTokens(user);
  return { user: toSafeUser(user), ...tokens };
}

export async function login(input: LoginInput): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const tokens = await issueTokens(user);
  return { user: toSafeUser(user), ...tokens };
}

export async function refresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = verifyRefreshToken(rawToken);
  const tokenHash = hashToken(rawToken);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  // Rotate: delete old token before issuing new one
  await prisma.refreshToken.delete({ where: { tokenHash } });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
  return issueTokens(user);
}

export async function logout(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

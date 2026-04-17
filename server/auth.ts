import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { CookieOptions, Request, Response } from "express";

const COOKIE = "sr_session";
const BCRYPT_ROUNDS = 11;

export const SESSION_SECRET_PRODUCTION_ERROR =
  "SESSION_SECRET must be set (min 16 chars) in production. Generate: openssl rand -hex 32";

/** Call once at process start so production misconfig fails fast instead of on first login. */
export function assertProductionSessionSecret(): void {
  const raw = process.env.SESSION_SECRET?.trim();
  if (process.env.NODE_ENV !== "production") return;
  if (raw && raw.length >= 16) return;
  throw new Error(SESSION_SECRET_PRODUCTION_ERROR);
}

function getSessionSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET?.trim();
  if (raw && raw.length >= 16) {
    return new TextEncoder().encode(raw);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(SESSION_SECRET_PRODUCTION_ERROR);
  }
  console.warn(
    "[auth] SESSION_SECRET not set — using insecure dev-only signing key",
  );
  return new TextEncoder().encode("dev-insecure-session-secret-min-32-chars!");
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSessionToken(userId: string): Promise<string> {
  const secret = getSessionSecret();
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(): CookieOptions {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE, token, sessionCookieOptions());
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE, { path: "/" });
}

export function readSessionCookie(req: Request): string | undefined {
  const c = req.cookies?.[COOKIE];
  return typeof c === "string" ? c : undefined;
}

export { COOKIE as SESSION_COOKIE_NAME };

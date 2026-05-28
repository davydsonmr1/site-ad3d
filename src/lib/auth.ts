import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { cookies } from "next/headers";

/**
 * Single-admin authentication.
 *
 * Credentials live in env (never in code or the client):
 *   ADMIN_USERNAME       — the login name
 *   ADMIN_PASSWORD_HASH  — scrypt hash "salt:hash" (generate with scripts/hash-password.mjs)
 *   ADMIN_SESSION_SECRET — HMAC secret for signing the session cookie
 *
 * The session is a signed, expiring token stored in an httpOnly cookie, so it
 * cannot be read or forged from client-side JavaScript.
 */

export const SESSION_COOKIE = "ad3d_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h

function sessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_SESSION_SECRET is required in production.");
    }
    return "dev-only-insecure-session-secret";
  }
  return s;
}

// ---- Password hashing (scrypt) ----

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Check submitted credentials against env. Constant-time-ish where it matters. */
export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? "";
  const expectedHash = process.env.ADMIN_PASSWORD_HASH ?? "";
  if (!expectedUser || !expectedHash) return false;

  const userOk =
    username.length === expectedUser.length &&
    timingSafeEqual(Buffer.from(username), Buffer.from(expectedUser));
  // Always run password verification to avoid leaking which field was wrong.
  const passOk = verifyPassword(password, expectedHash);
  return userOk && passOk;
}

// ---- Session token (HMAC, expiring) ----

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", sessionSecret()).update(payload).digest());
}

export function createSessionToken(username: string): string {
  const payload = b64url(
    JSON.stringify({
      u: username,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;

  const a = Buffer.from(signature);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof claims.exp === "number" && Math.floor(Date.now() / 1000) <= claims.exp;
  } catch {
    return false;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;

/** Read the session cookie (server components / route handlers) and verify it. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

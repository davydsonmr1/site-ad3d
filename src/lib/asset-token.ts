import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed-URL layer for protected assets.
 *
 * A token binds a specific asset path to an expiry timestamp and is signed
 * with a server-only secret (ASSET_SIGNING_SECRET). The client never learns
 * the secret, so it cannot forge URLs for assets it was not granted, and any
 * leaked URL stops working once it expires. This is the part that is *real*
 * protection — unlike client-side context-menu blocking.
 */

const SECRET = process.env.ASSET_SIGNING_SECRET ?? "";

if (!SECRET && process.env.NODE_ENV === "production") {
  // Fail loudly in prod rather than silently signing with an empty key.
  throw new Error("ASSET_SIGNING_SECRET is required in production.");
}

const DEV_FALLBACK_SECRET = "dev-only-insecure-secret-change-me";

function key(): string {
  return SECRET || DEV_FALLBACK_SECRET;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface AssetClaims {
  /** Asset path relative to the protected store, e.g. "products/piece-01.webp". */
  path: string;
  /** Unix epoch seconds after which the token is invalid. */
  exp: number;
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", key()).update(payload).digest());
}

/** Create a signed token for an asset, valid for `ttlSeconds`. */
export function signAsset(path: string, ttlSeconds = 300): string {
  const claims: AssetClaims = {
    path,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payload = base64url(JSON.stringify(claims));
  return `${payload}.${sign(payload)}`;
}

export interface VerifyResult {
  ok: boolean;
  claims?: AssetClaims;
  reason?: "malformed" | "bad-signature" | "expired" | "bad-path";
}

/** Verify a token: signature, expiry, and path-traversal safety. */
export function verifyAsset(token: string): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };

  const [payload, signature] = parts;
  const expected = sign(payload);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad-signature" };
  }

  let claims: AssetClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof claims.path !== "string" || typeof claims.exp !== "number") {
    return { ok: false, reason: "malformed" };
  }

  // Reject traversal / absolute paths up front.
  if (
    claims.path.includes("..") ||
    claims.path.startsWith("/") ||
    claims.path.includes("\\") ||
    claims.path.includes("\0")
  ) {
    return { ok: false, reason: "bad-path" };
  }

  if (Math.floor(Date.now() / 1000) > claims.exp) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, claims };
}

/** Build the public URL the browser will request for a protected asset. */
export function assetUrl(path: string, ttlSeconds = 300): string {
  return `/api/asset?token=${encodeURIComponent(signAsset(path, ttlSeconds))}`;
}

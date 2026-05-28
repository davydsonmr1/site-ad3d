import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { verifyAsset } from "@/lib/asset-token";
import {
  isSupabaseEnabled,
  getSupabase,
  SUPABASE_BUCKET,
} from "@/lib/supabase";

/**
 * Protected asset endpoint.
 *
 * Real protections enforced here (server-side, cannot be bypassed from the DOM):
 *   1. Signed token (HMAC) — only paths the server granted can be fetched, and
 *      the grant expires.
 *   2. Anti-hotlink — the request's Origin/Referer must match an allowed host,
 *      so other sites cannot embed your photos.
 *   3. Optional watermark — burned in before bytes leave the server, so any
 *      screenshot/copy still carries provenance.
 *   4. Cache headers — `private` keeps signed images out of shared/CDN caches.
 *
 * Originals live OUTSIDE /public, in `protected/`, so they are never statically
 * served and never reachable without a valid token.
 */

export const runtime = "nodejs";

const PROTECTED_DIR = path.join(process.cwd(), "protected");

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

/** Hosts permitted to embed protected assets. Comma-separated env override. */
function allowedHosts(req: NextRequest): Set<string> {
  const env = process.env.ALLOWED_ASSET_HOSTS;
  const hosts = env ? env.split(",").map((h) => h.trim()).filter(Boolean) : [];
  const self = req.headers.get("host");
  if (self) hosts.push(self);
  return new Set(hosts);
}

function isAllowedReferer(req: NextRequest): boolean {
  // Allow direct navigation in development for easier testing.
  if (process.env.NODE_ENV !== "production") return true;

  const allowed = allowedHosts(req);
  const candidate = req.headers.get("origin") ?? req.headers.get("referer");
  if (!candidate) return false; // In prod, require an Origin/Referer.

  try {
    return allowed.has(new URL(candidate).host);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!isAllowedReferer(req)) {
    return new NextResponse("Forbidden: hotlinking is not allowed.", {
      status: 403,
    });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token.", { status: 400 });
  }

  const result = verifyAsset(token);
  if (!result.ok || !result.claims) {
    const status = result.reason === "expired" ? 410 : 401;
    return new NextResponse(`Invalid token: ${result.reason}`, { status });
  }

  const ext = path.extname(result.claims.path).toLowerCase();
  const contentType = MIME[ext];
  if (!contentType) {
    return new NextResponse("Unsupported asset type.", { status: 415 });
  }

  const raw = await loadAsset(result.claims.path);
  if (raw === "forbidden") {
    return new NextResponse("Forbidden.", { status: 403 });
  }
  if (!raw) {
    return new NextResponse("Asset not found.", { status: 404 });
  }

  const watermark = process.env.ASSET_WATERMARK_ENABLED === "true";
  let body: Buffer = raw;
  let outType = contentType;

  if (watermark) {
    const text = process.env.ASSET_WATERMARK_TEXT ?? "AD3D.LAB";
    body = await applyWatermark(raw, text);
    outType = "image/webp";
  }

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": outType,
      // private = never stored in shared/CDN caches; tied to this viewer.
      "Cache-Control": "private, max-age=60, must-revalidate",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

/**
 * Load asset bytes from the active store. The path was already validated by
 * verifyAsset (no traversal). Returns a Buffer, null (not found), or the
 * literal "forbidden" when a local path escapes the protected dir.
 */
async function loadAsset(relPath: string): Promise<Buffer | null | "forbidden"> {
  if (isSupabaseEnabled()) {
    const { data, error } = await getSupabase()
      .storage.from(SUPABASE_BUCKET)
      .download(relPath);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }

  const absolute = path.resolve(PROTECTED_DIR, relPath);
  if (
    absolute !== PROTECTED_DIR &&
    !absolute.startsWith(PROTECTED_DIR + path.sep)
  ) {
    return "forbidden";
  }
  try {
    await stat(absolute);
  } catch {
    return null;
  }
  return readFile(absolute);
}

/** Burn a tiled, semi-transparent watermark into the image via sharp. */
async function applyWatermark(input: Buffer, text: string): Promise<Buffer> {
  const image = sharp(input);
  const meta = await image.metadata();
  const width = meta.width ?? 1200;
  const height = meta.height ?? 800;

  const safeText = text.replace(/[<>&"']/g, "");
  const fontSize = Math.max(18, Math.round(width / 28));

  const overlay = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <pattern id="wm" width="${width / 3}" height="${height / 4}"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(-30)">
           <text x="0" y="${fontSize}" font-family="sans-serif"
                 font-size="${fontSize}" font-weight="700"
                 fill="rgba(255,255,255,0.10)">${safeText}</text>
         </pattern>
       </defs>
       <rect width="100%" height="100%" fill="url(#wm)"/>
     </svg>`,
  );

  return image
    .composite([{ input: overlay, blend: "over" }])
    .webp({ quality: 82 })
    .toBuffer();
}

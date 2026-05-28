import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

// supabase-js initializes a realtime client that needs a global WebSocket.
// Node < 22 has none, so provide the `ws` implementation. Server-only.
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = ws;
}

/**
 * Server-only Supabase client.
 *
 * Uses the SERVICE ROLE key, which bypasses Row Level Security. This key must
 * NEVER reach the browser — it is only imported from server components and
 * route handlers (nodejs runtime). Do not import this module from "use client"
 * files.
 *
 * When the env vars are absent (e.g. before the project is provisioned), the
 * app falls back to local file storage so development keeps working.
 */

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? "assets";
export const CONTENT_TABLE = "site_content";
export const CONTENT_ROW_ID = 1;

let cached: SupabaseClient | null = null;

export function isSupabaseEnabled(): boolean {
  return Boolean(url && serviceKey);
}

export function getSupabase(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

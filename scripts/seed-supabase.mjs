// One-time Supabase seed: creates the private "assets" bucket, uploads every
// file under ./protected to it (preserving relative paths), and seeds the
// content row from ./data/content.json if present.
//
// Run with env loaded:
//   node --env-file=.env.local scripts/seed-supabase.mjs
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import ws from "ws";

// Node < 22 has no global WebSocket; supabase-js realtime needs one.
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = ws;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET ?? "assets";

if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MIME = {
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(bucket);
  if (data) {
    console.log(`bucket "${bucket}" já existe`);
    return;
  }
  const { error } = await supabase.storage.createBucket(bucket, { public: false });
  if (error) throw error;
  console.log(`bucket "${bucket}" criado (privado)`);
}

async function walk(dir, base) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, base)));
    else out.push({ full, rel: path.relative(base, full).split(path.sep).join("/") });
  }
  return out;
}

async function uploadAssets() {
  const base = path.join(process.cwd(), "protected");
  const files = await walk(base, base);
  if (files.length === 0) {
    console.log("nenhum arquivo em ./protected para enviar");
    return;
  }
  for (const f of files) {
    const ext = path.extname(f.full).toLowerCase();
    const body = await readFile(f.full);
    const { error } = await supabase.storage
      .from(bucket)
      .upload(f.rel, body, { contentType: MIME[ext] ?? "application/octet-stream", upsert: true });
    if (error) console.error(`  falhou ${f.rel}: ${error.message}`);
    else console.log(`  enviado ${f.rel}`);
  }
}

async function seedContent() {
  const p = path.join(process.cwd(), "data", "content.json");
  try {
    await stat(p);
  } catch {
    console.log("sem data/content.json — pulando seed de conteúdo (app usa defaults)");
    return;
  }
  const data = JSON.parse(await readFile(p, "utf8"));
  const { error } = await supabase
    .from("site_content")
    .upsert({ id: 1, data, updated_at: new Date().toISOString() });
  if (error) throw error;
  console.log("conteúdo inicial gravado na tabela site_content (id=1)");
}

await ensureBucket();
await uploadAssets();
await seedContent();
console.log("seed concluído.");

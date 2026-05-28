import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { isAuthenticated } from "@/lib/auth";
import { assetUrl } from "@/lib/asset-token";
import {
  isSupabaseEnabled,
  getSupabase,
  SUPABASE_BUCKET,
} from "@/lib/supabase";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ACCEPTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }
  if (!ACCEPTED.has(file.type)) {
    return NextResponse.json(
      { error: "Tipo de imagem não suportado." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Imagem excede 12 MB." },
      { status: 413 },
    );
  }

  const input = Buffer.from(await file.arrayBuffer());

  // Re-encode through sharp: validates it is a real image, strips EXIF/metadata,
  // and normalizes to WebP. A non-image payload throws and is rejected.
  let webp: Buffer;
  try {
    webp = await sharp(input)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "Arquivo não é uma imagem válida." },
      { status: 422 },
    );
  }

  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.webp`;
  const relPath = `uploads/${name}`;

  if (isSupabaseEnabled()) {
    const { error } = await getSupabase()
      .storage.from(SUPABASE_BUCKET)
      .upload(relPath, webp, { contentType: "image/webp", upsert: false });
    if (error) {
      return NextResponse.json(
        { error: `Falha ao enviar para o Storage: ${error.message}` },
        { status: 502 },
      );
    }
  } else {
    const dir = path.join(process.cwd(), "protected", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), webp);
  }

  return NextResponse.json({ path: relPath, url: assetUrl(relPath, 600) });
}

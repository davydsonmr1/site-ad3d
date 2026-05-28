import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { assetUrl } from "@/lib/asset-token";

export const runtime = "nodejs";

/** Mint a short-lived signed URL so the admin UI can preview a protected image. */
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const p = req.nextUrl.searchParams.get("path") ?? "";
  if (!p || p.includes("..") || p.startsWith("/") || p.includes("\\")) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  }
  return NextResponse.json({ url: assetUrl(p, 600) });
}

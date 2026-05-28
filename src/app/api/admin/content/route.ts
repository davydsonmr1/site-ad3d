import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { readContent, writeContent, sanitizeContent } from "@/lib/content";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  return NextResponse.json(await readContent());
}

export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const clean = sanitizeContent(body);
    await writeContent(clean);
    return NextResponse.json({ ok: true, content: clean });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível salvar o conteúdo." },
      { status: 422 },
    );
  }
}

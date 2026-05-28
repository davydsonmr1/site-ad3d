import { NextResponse } from "next/server";
import {
  checkCredentials,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const { username, password } = (body ?? {}) as {
    username?: unknown;
    password?: unknown;
  };

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Credenciais ausentes." }, { status: 400 });
  }

  if (!checkCredentials(username, password)) {
    return NextResponse.json(
      { error: "Usuário ou senha incorretos." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

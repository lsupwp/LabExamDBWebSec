import { NextResponse } from "next/server";
import {
  createSessionToken,
  registerUser,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  const result = await registerUser(username, password);
  const stored =
    result.ok && "username" in result ? result.username : username.toLowerCase();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const res = NextResponse.json({
    ok: true,
    username: stored,
    dbName: result.dbName,
    hint: `ฐานข้อมูลของคุณคือ ${result.dbName} — ดาวน์โหลด starter จะได้ .env / user.sql ที่ผูกกับบัญชีนี้`,
  });
  res.cookies.set(sessionCookieName(), createSessionToken(stored), sessionCookieOptions());
  return res;
}

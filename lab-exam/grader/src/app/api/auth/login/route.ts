import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieName,
  sessionCookieOptions,
  verifyUser,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  const user = await verifyUser(username, password);
  if (!user) {
    return NextResponse.json({ error: "username หรือ password ไม่ถูก" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, username: user.username });
  res.cookies.set(sessionCookieName(), createSessionToken(user.username), sessionCookieOptions());
  return res;
}

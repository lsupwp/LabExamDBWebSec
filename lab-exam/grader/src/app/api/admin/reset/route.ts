import { NextResponse } from "next/server";
import { clearAllUsers } from "@/lib/auth";
import { clearStudentDatabases } from "@/lib/userDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reset?key=...
 * Clears grader users + drops db_* student databases. For lab operator only.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || req.headers.get("x-reset-key") || "";
  const expect = process.env.RESET_KEY || "labexam-reset";
  if (key !== expect) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = await clearStudentDatabases();
  clearAllUsers();

  return NextResponse.json({
    ok: db.ok,
    usersCleared: true,
    databases: db,
  });
}

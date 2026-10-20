import { NextResponse } from "next/server";
import { getUser, getUsernameFromRequest } from "@/lib/auth";
import { REQUIRED_FILES } from "@/lib/requiredFiles";
import { dbNameFor } from "@/lib/userDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const username = getUsernameFromRequest(req);
  const user = username ? getUser(username) : null;
  // After admin reset, cookie may still verify — do not invent a logged-in user
  if (!user) {
    return NextResponse.json({
      username: null,
      dbName: null,
      requiredFiles: REQUIRED_FILES,
      mysqlUser: null,
    });
  }
  const dbName = user.dbName || dbNameFor(user.username);
  return NextResponse.json({
    username: user.username,
    dbName,
    requiredFiles: REQUIRED_FILES,
    mysqlUser: user.username,
  });
}

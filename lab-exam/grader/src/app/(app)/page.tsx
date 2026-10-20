import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser, readSessionToken, sessionCookieName } from "@/lib/auth";
import { buildChecklistGroups } from "@/lib/checklistGroups";
import { dbNameFor } from "@/lib/userDb";
import Workspace from "./workspace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jar = await cookies();
  const username = readSessionToken(jar.get(sessionCookieName())?.value);
  if (!username) redirect("/login");
  const user = getUser(username);
  const dbName = user?.dbName || dbNameFor(username);
  const checklistGroups = buildChecklistGroups();
  return <Workspace username={username} dbName={dbName} checklistGroups={checklistGroups} />;
}

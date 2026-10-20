import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, sessionCookieName } from "@/lib/auth";
import AppNav from "./AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const username = readSessionToken(jar.get(sessionCookieName())?.value);
  if (!username) redirect("/login");

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden">
      <AppNav username={username} />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

export default function AppNav({ username }: { username: string }) {
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="navbar min-h-12 shrink-0 bg-base-100 border-b border-base-300 px-4 lg:px-6 z-30">
      <div className="flex-1">
        <a href="/" className="btn btn-ghost btn-sm text-base font-bold normal-case">
          Smart Condo Portal
        </a>
      </div>
      <div className="flex-none items-center gap-2">
        <span className="badge badge-outline badge-sm hidden sm:inline-flex">{username}</span>
        <a href="/" className="btn btn-ghost btn-sm">
          Workspace
        </a>
        <a href="/guide" className="btn btn-ghost btn-sm">
          คู่มือ / Example
        </a>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => void onLogout()}>
          Logout
        </button>
      </div>
    </div>
  );
}

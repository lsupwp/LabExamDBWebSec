"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "login failed");
      router.replace(params.get("next") || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md">
      <h1 className="text-3xl font-bold">Login</h1>
      <p className="mt-2 text-base-content/70">เข้าสู่ระบบก่อนใช้ Checklist / Grade</p>
      <form onSubmit={onSubmit} className="card bg-base-100 shadow-md mt-4">
        <div className="card-body gap-3">
          <label className="form-control w-full">
            <span className="label-text mb-1">Username</span>
            <input
              className="input input-bordered w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1">Password</span>
            <input
              type="password"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <div className="alert alert-error text-sm py-2">{error}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? <span className="loading loading-spinner" /> : "Login"}
          </button>
          <p className="text-sm text-base-content/70">
            ยังไม่มีบัญชี?{" "}
            <a className="link link-primary" href="/register">
              Register
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

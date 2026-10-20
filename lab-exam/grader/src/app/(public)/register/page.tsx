"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "register failed");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md">
      <h1 className="text-3xl font-bold">Register</h1>
      <p className="mt-2 text-base-content/70">
        Username นี้จะใช้เป็นชื่อ <strong>MySQL user</strong> ด้วย (ตัวเล็ก a-z เท่านั้น)
      </p>
      <form onSubmit={onSubmit} className="card bg-base-100 shadow-md mt-4">
        <div className="card-body gap-3">
          <label className="form-control w-full">
            <span className="label-text mb-1">Username</span>
            <input
              className="input input-bordered w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              pattern="[a-z][a-z0-9_]{2,31}"
              placeholder="std64001"
              title="ตัวเล็ก a-z, 0-9, _ เท่านั้น (3–32 ตัว)"
              autoComplete="username"
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1">Password (≥8)</span>
            <input
              type="password"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          {error && <div className="alert alert-error text-sm py-2">{error}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? <span className="loading loading-spinner" /> : "Create account"}
          </button>
          <p className="text-sm text-base-content/70">
            มีบัญชีแล้ว?{" "}
            <a className="link link-primary" href="/login">
              Login
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}

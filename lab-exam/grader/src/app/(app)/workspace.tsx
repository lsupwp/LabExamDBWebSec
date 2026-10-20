"use client";

import { useMemo, useState } from "react";
import { REQUIRED_FILES } from "@/lib/requiredFiles";
import type { ChecklistGroup } from "@/lib/checklistGroups";

type CheckResult = {
  id: string;
  lab: string;
  title: string;
  pass: boolean;
  hint: string;
  expected: string;
  detail?: string;
};

type Status = "pending" | "pass" | "fail";

function statusClass(st: Status) {
  if (st === "pass") return "border-success/50 bg-success/10";
  if (st === "fail") return "border-error/60 bg-error/15";
  return "border-base-300 bg-base-100";
}

function badgeClass(st: Status) {
  if (st === "pass") return "badge-success";
  if (st === "fail") return "badge-error";
  return "badge-ghost";
}

export default function Workspace({
  username,
  dbName,
  checklistGroups,
}: {
  username: string;
  dbName: string;
  checklistGroups: ChecklistGroup[];
}) {
  const groups = checklistGroups;
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [missingFiles, setMissingFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const byId = useMemo(() => {
    const map = new Map<string, CheckResult>();
    for (const r of results || []) map.set(r.id, r);
    return map;
  }, [results]);

  function statusOf(id: string): Status {
    const r = byId.get(id);
    if (!r) return "pending";
    return r.pass ? "pass" : "fail";
  }

  function groupStatus(ids: string[]): Status {
    if (!results) return "pending";
    const states = ids.map(statusOf);
    if (states.some((s) => s === "fail")) return "fail";
    if (states.every((s) => s === "pass")) return "pass";
    return "pending";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResults(null);
    setMissingFiles([]);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/grade", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "grade failed");
      setResults(data.results as CheckResult[]);
      setMissingFiles(data.missingFiles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setBusy(false);
    }
  }

  const passed = results?.filter((r) => r.pass).length ?? 0;
  const total = results?.length ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-3 lg:p-4">
      <header className="shrink-0 px-1">
        <h1 className="text-xl font-bold leading-tight lg:text-2xl">Lab Exam Workspace</h1>
        <p className="mt-0.5 text-xs text-base-content/70 lg:text-sm">
          DB = <code className="text-primary">{dbName}</code>
          {" · "}
          MySQL user = <code className="text-primary">{username}</code>
          {" · "}
          รันแอปด้วย Docker Compose ของคุณเอง · ส่ง ZIP ที่นี่อย่างเดียว
        </p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Left: Checklist — own scroll */}
        <aside className="flex min-h-0 flex-col lg:col-span-5 xl:col-span-4">
          <div className="card flex min-h-0 flex-1 flex-col bg-base-100 shadow-md">
            <div className="shrink-0 border-b border-base-300 px-4 py-3">
              <h2 className="card-title text-base">Checklist</h2>
              <p className="text-xs text-base-content/60">
                แต่ละข้อมี &quot;ทำ&quot; + &quot;Example&quot; · รายละเอียดเต็มที่{" "}
                <a className="link link-primary" href="/guide">
                  คู่มือ / Example
                </a>
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
              {groups.map((g) => {
                const ids = g.items.map((i) => i.id);
                const gs = groupStatus(ids);
                return (
                  <div
                    key={g.lab}
                    className={`collapse collapse-arrow border ${statusClass(gs)}`}
                  >
                    <input type="checkbox" defaultChecked />
                    <div className="collapse-title min-h-0 py-3 pr-10 text-sm font-semibold flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          gs === "pass"
                            ? "bg-success"
                            : gs === "fail"
                              ? "bg-error"
                              : "bg-base-300"
                        }`}
                      />
                      <span className="flex-1">{g.lab}</span>
                      <span className="badge badge-sm badge-ghost font-normal">
                        {results
                          ? `${ids.filter((id) => statusOf(id) === "pass").length}/${ids.length}`
                          : `${ids.length}`}
                      </span>
                    </div>
                    <div className="collapse-content px-2">
                      <ul className="space-y-2">
                        {g.items.map((item) => {
                          const st = statusOf(item.id);
                          const r = byId.get(item.id);
                          return (
                            <li
                              key={item.id}
                              className={`rounded-box border p-2.5 text-sm ${statusClass(st)}`}
                            >
                              <div className="flex items-start gap-2">
                                <span
                                  className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                                    st === "pass"
                                      ? "bg-success"
                                      : st === "fail"
                                        ? "bg-error"
                                        : "bg-base-300"
                                  }`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium leading-snug">{item.title}</span>
                                    {results && (
                                      <span className={`badge badge-sm ${badgeClass(st)}`}>
                                        {st === "pass" ? "PASS" : st === "fail" ? "FAIL" : "—"}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-xs leading-snug text-base-content/75">
                                    <span className="font-semibold text-base-content/50">ทำ: </span>
                                    {item.how}
                                  </p>
                                  <p className="mt-1 text-xs leading-snug text-primary/90">
                                    <span className="font-semibold text-base-content/50">
                                      Example:{" "}
                                    </span>
                                    {item.expected}
                                  </p>
                                  {st === "fail" && r && (
                                    <div className="alert alert-error mt-2 py-1.5 px-2 text-xs">
                                      {r.hint || r.detail || r.expected}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right: Grade — own scroll */}
        <section className="flex min-h-0 flex-col lg:col-span-7 xl:col-span-8">
          <div className="card flex min-h-0 flex-1 flex-col bg-base-100 shadow-md">
            <div className="shrink-0 border-b border-base-300 px-4 py-3">
              <h2 className="card-title text-base">Grade</h2>
              <p className="text-xs text-base-content/60">อัปโหลด ZIP · scroll ในแผงนี้</p>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
              <div>
                <div className="divider my-1">ไฟล์ใน ZIP</div>
                <p className="text-sm text-base-content/70">
                  ต้องมีไฟล์เหล่านี้ใน ZIP (เตือนถ้าขาด) — <strong>ไม่นับคะแนน</strong> จากมีไฟล์ครบ
                </p>
                <ul className="menu menu-sm bg-base-200 rounded-box mt-1">
                  {REQUIRED_FILES.map((f) => (
                    <li key={f.name} className="pointer-events-none">
                      <span>
                        <code className="text-primary">{f.name}</code>
                        <span className="text-base-content/60"> — {f.why}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="divider">.env + user.sql</div>
                <div className="alert text-sm">
                  <span>
                    Starter มี <code>.env</code> (DB_NAME=<code>{dbName}</code>, DB_PASS
                    สร้างให้แล้ว ≠ รหัส login) และ <code>user.sql</code> (CREATE USER
                    พร้อมรหัสนั้น) — คุณเพิ่มสิทธิ์ Least Privilege เองใน user.sql · form
                    ตัด <code>method</code> ให้ใส่เอง (Lab02)
                  </span>
                </div>
              </div>

              <div>
                <div className="divider">อัปโหลดงานเพื่อตรวจ</div>
                <p className="text-sm mb-2">
                  <a className="link link-primary" href="/api/download">
                    Download starter.zip
                  </a>
                </p>
                <form onSubmit={onSubmit} className="space-y-3">
                  <input
                    type="file"
                    name="submission"
                    accept=".zip,application/zip"
                    required
                    className="file-input file-input-bordered w-full"
                  />
                  <button className="btn btn-primary" disabled={busy} type="submit">
                    {busy ? (
                      <>
                        <span className="loading loading-spinner" /> unzip + ตรวจ...
                      </>
                    ) : (
                      "Run checks"
                    )}
                  </button>
                </form>

                {error && <div className="alert alert-error mt-2">{error}</div>}
                {missingFiles.length > 0 && (
                  <div className="alert alert-warning mt-2 text-sm">
                    <span>
                      ไฟล์หาย:{" "}
                      {missingFiles.map((m) => (
                        <code key={m} className="mr-1">
                          {m}
                        </code>
                      ))}
                    </span>
                  </div>
                )}
                {results && (
                  <div className="stats shadow mt-2 bg-base-200 w-full">
                    <div className="stat py-3">
                      <div className="stat-title">Score</div>
                      <div className="stat-value text-2xl">
                        {passed}/{total}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {results && (
                <div>
                  <h3 className="font-semibold mb-2">รายละเอียดผลตรวจ</h3>
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Lab</th>
                          <th>ข้อย่อย</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r.id} className={r.pass ? "" : "bg-error/10"}>
                            <td className="font-semibold text-primary whitespace-nowrap">
                              {r.lab}
                            </td>
                            <td>
                              <div>{r.title}</div>
                              {!r.pass && (
                                <div className="text-error text-xs mt-1">
                                  {r.hint || r.detail}
                                </div>
                              )}
                            </td>
                            <td>
                              <span
                                className={`badge badge-sm ${r.pass ? "badge-success" : "badge-error"}`}
                              >
                                {r.pass ? "PASS" : "FAIL"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

import type { CheckResult } from "./checks";
import { httpRequest } from "./httpClient";
import { allRuntimeCases, runtimeChecklistMeta as metaFromLabs } from "@/labs/index";
import {
  CookieJar,
  looksLikeLoginPage,
  vhost,
  type RuntimeCtx,
} from "@/labs/shared/runtimeKit";

export type { RuntimeCtx };

export async function runRuntimeTests(ctx: RuntimeCtx): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // Boot probe is informational — always continue per-lab checks afterward.
  try {
    const probe = await httpRequest({
      hostname: ctx.runnerHost,
      port: ctx.runnerPort || 80,
      hostHeader: vhost(ctx),
      path: "/login.php",
    });
    const ok = looksLikeLoginPage(probe.status, probe.body);
    const bodySnap = probe.body.replace(/\s+/g, " ").slice(0, 180);
    const accessDenied = /Access denied/i.test(probe.body);
    results.push({
      id: "RT-boot",
      lab: "Runtime",
      title: "เริ่มต้นแอปจาก ZIP",
      pass: ok,
      hint: ok
        ? ""
        : accessDenied
          ? "แอปต่อ MySQL ไม่ได้ — ให้ IDENTIFIED BY ใน user.sql ตรงกับ DB_PASS ใน .env ทุกตัวอักษร (แล้ว ZIP ส่งใหม่)"
          : "โครงสร้าง ZIP ต้องรันได้ + .env/user.sql ต้องเชื่อม DB ได้ (ใส่ GRANT Least Privilege ใน user.sql)",
      expected: "GET /login.php → 200 และเป็นหน้า login จริง",
      detail: `status=${probe.status} body=${bodySnap}`,
    });
  } catch (err) {
    results.push({
      id: "RT-boot",
      lab: "Runtime",
      title: "เริ่มต้นแอปจาก ZIP",
      pass: false,
      hint: "ติดต่อ runner ไม่ได้ หรือไฟล์ใน ZIP ยังรันไม่ได้",
      expected: "GET /login.php → 200 และเป็นหน้า login จริง",
      detail: err instanceof Error ? err.message : "fetch failed",
    });
  }

  // Run every lab RT independently — pass/fail per case (do not abort on boot fail).
  for (const c of allRuntimeCases()) {
    try {
      const r = await c.run(ctx, new CookieJar());
      results.push({
        id: c.id,
        lab: c.lab,
        title: c.title,
        pass: r.pass,
        hint: r.pass ? "" : c.hint,
        expected: c.expected,
        detail: r.detail,
      });
    } catch (err) {
      results.push({
        id: c.id,
        lab: c.lab,
        title: c.title,
        pass: false,
        hint: c.hint,
        expected: c.expected,
        detail: err instanceof Error ? err.message : "test error",
      });
    }
  }
  return results;
}

export function runtimeChecklistMeta() {
  return metaFromLabs();
}

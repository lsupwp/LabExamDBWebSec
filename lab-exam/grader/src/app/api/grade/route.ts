import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { ensureDbPass, getUser, getUsernameFromRequest } from "@/lib/auth";
import type { FileMap, CheckResult } from "@/lib/checks";
import { checkLeastPrivilegeUser } from "@/lib/dbGrants";
import { matchRequiredFiles } from "@/lib/requiredFiles";
import { materializeApp } from "@/lib/materialize";
import { runRuntimeTests } from "@/lib/runtimeTests";
import { identifiedByPassword, runUserSql } from "@/lib/runUserSql";
import { dbNameFor, parseEnv, resetUserMysqlForGrade } from "@/lib/userDb";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedFile(base: string): boolean {
  if (base.toLowerCase() === ".env") return true;
  return /\.(php|css|html|md|txt|sql)$/i.test(base);
}

function entryBase(key: string): string {
  const norm = key.replace(/\\/g, "/");
  return norm.includes("/") ? norm.slice(norm.lastIndexOf("/") + 1) : norm;
}

function findByBasename(files: FileMap, basename: string): string | null {
  const want = basename.toLowerCase();
  for (const [k, v] of Object.entries(files)) {
    if (entryBase(k).toLowerCase() === want) return v;
  }
  return null;
}

/**
 * First-wins for .env / user.sql (case-insensitive → lowercase key) and critical PHP
 * so L08 + materialize agree and ZIP order cannot last-overwrite login/config.
 */
function canonicalizeBasenames(files: FileMap): FileMap {
  const out: FileMap = { ...files };

  // .env / user.sql — case-insensitive, store under canonical lowercase basename
  for (const basename of [".env", "user.sql"] as const) {
    const chosen = findByBasename(files, basename);
    if (chosen == null) continue;
    for (const k of Object.keys(out)) {
      if (entryBase(k).toLowerCase() === basename) delete out[k];
    }
    out[basename] = chosen;
  }

  // Critical PHP — exact basename (Linux FS), first zip entry wins, canonical www/ path
  const criticalPhp: { base: string; dest: string }[] = [
    { base: "login.php", dest: "www/login.php" },
    { base: "login_process.php", dest: "www/login_process.php" },
    { base: "config.php", dest: "www/includes/config.php" },
  ];
  for (const { base, dest } of criticalPhp) {
    let chosen: string | null = null;
    const keysToDrop: string[] = [];
    for (const [k, v] of Object.entries(files)) {
      if (entryBase(k) !== base) continue;
      keysToDrop.push(k);
      if (chosen == null) chosen = v;
    }
    if (chosen == null) continue;
    for (const k of keysToDrop) delete out[k];
    // also drop dest if it was a different key spelling
    delete out[dest];
    out[dest] = chosen;
  }

  return out;
}

const GRADE_LOCK_STALE_MS = 30_000;

/** Serialize grade per user — concurrent DROP DATABASE / materialize races → 500. */
async function withGradeUserLock<T>(
  username: string,
  dataDir: string,
  fn: () => Promise<T>
): Promise<T> {
  const lockDir = path.join(dataDir, "submissions");
  fs.mkdirSync(lockDir, { recursive: true });
  const lockPath = path.join(lockDir, `${username}.grade.lock`);
  const start = Date.now();
  while (true) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      try {
        return await fn();
      } finally {
        fs.closeSync(fd);
        try {
          fs.unlinkSync(lockPath);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "EEXIST") {
        // Crash leftover lock — drop if older than stale window
        try {
          const st = fs.statSync(lockPath);
          if (Date.now() - st.mtimeMs > GRADE_LOCK_STALE_MS) {
            fs.unlinkSync(lockPath);
            continue;
          }
        } catch {
          /* ignore */
        }
        if (Date.now() - start > 120_000) {
          return Promise.reject(err);
        }
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }
      throw err;
    }
  }
}

export async function POST(req: Request) {
  const username = getUsernameFromRequest(req);
  if (!username) {
    return NextResponse.json({ error: "ต้อง login ก่อนส่งงาน" }, { status: 401 });
  }
  const user = getUser(username);
  // After admin reset, cookie may still verify — reject if user no longer exists
  if (!user) {
    return NextResponse.json({ error: "ต้อง login ก่อนส่งงาน" }, { status: 401 });
  }
  const dbName = user.dbName || dbNameFor(username);
  const dbPass = ensureDbPass(username);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "multipart ไม่ถูกต้อง" }, { status: 400 });
  }
  const file = form.get("submission");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing submission zip" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "รับเฉพาะไฟล์ .zip" }, { status: 400 });
  }
  if (file.size > 5_000_000) {
    return NextResponse.json({ error: "zip ใหญ่เกิน 5MB" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let zip: AdmZip;
  try {
    zip = new AdmZip(buf);
  } catch {
    return NextResponse.json({ error: "unzip ไม่ได้ — ไฟล์ zip เสีย" }, { status: 400 });
  }

  const files: FileMap = {};
  const paths: string[] = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\\/g, "/");
    if (name.includes("..")) continue;
    const base = name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name;
    if (!isAllowedFile(base)) continue;
    if (entry.header.size > 400_000) continue;
    files[name] = entry.getData().toString("utf8");
    paths.push(name);
  }

  if (Object.keys(files).length === 0) {
    return NextResponse.json({ error: "ใน zip ไม่มีไฟล์ที่อ่านได้" }, { status: 400 });
  }

  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const canon = canonicalizeBasenames(files);

  return withGradeUserLock(username, dataDir, async () => {
    const { detail: matDetail } = materializeApp(canon, username, dataDir);
    try {
      fs.writeFileSync(
        path.join(dataDir, "submissions", username, "_uploaded_at.txt"),
        new Date().toISOString() + "\n" + matDetail + "\n",
        "utf8"
      );
    } catch {
      // non-fatal
    }

    const reset = await resetUserMysqlForGrade(username);
    if (!reset.ok) {
      return NextResponse.json({ error: reset.detail }, { status: 500 });
    }

    const fileMatch = matchRequiredFiles(paths);

    // Run SQL first, then grants — L08-env / L08-run-sql only PASS when Least Privilege is done.
    // Untouched starter (CREATE USER only, no GRANT) → baseline = 16 FILE checks only.
    const userSql = findByBasename(canon, "user.sql");
    let sqlRanOk = false;
    let sqlDetail = "missing user.sql";
    let sqlPassMismatch = false;
    if (userSql) {
      const byPass = identifiedByPassword(userSql);
      // App reads DB_PASS from .env — if IDENTIFIED BY differs, RT-boot gets Access denied
      // even when GRANT checks pass.
      if (byPass !== null && byPass !== dbPass) {
        sqlPassMismatch = true;
        sqlDetail =
          "IDENTIFIED BY ใน user.sql ไม่ตรง DB_PASS ใน .env — คัดลอก DB_PASS จาก .env ใส่ IDENTIFIED BY ให้ตรงทุกตัวอักษร";
      } else {
        const ran = await runUserSql(userSql, username);
        sqlRanOk = ran.ok;
        sqlDetail = ran.detail;
      }
    }

    const grants = await checkLeastPrivilegeUser(username, dbName);
    const grantsResult: CheckResult = {
      id: "L08-grants",
      lab: "Lab08",
      title: `สิทธิ์ Least Privilege บน ${dbName}`,
      pass: grants.pass,
      hint: grants.pass ? "" : `ปรับสิทธิ์ใน user.sql บน ${dbName} ตาม Least Privilege (ใส่ GRANT เอง)`,
      expected: "สิทธิ์ไม่เกินจำเป็นบนฐานข้อมูลส่วนตัวของคุณ",
      detail: grants.detail,
    };

    const envText = findByBasename(canon, ".env");
    let envResult: CheckResult;
    if (!envText) {
      envResult = {
        id: "L08-env",
        lab: "Lab08",
        title: ".env ครบและตรงบัญชี",
        pass: false,
        hint: "ใส่ .env จาก starter (DB_NAME / DB_USER ต้องตรงบัญชีคุณ)",
        expected: `DB_NAME=${dbName}, DB_USER=${username}`,
        detail: "missing .env",
      };
    } else {
      const env = parseEnv(envText);
      const envMatch =
        env.DB_NAME === dbName &&
        env.DB_USER === username &&
        env.DB_PASS === dbPass;
      // ไม่ผ่านอัตโนมัติแค่มี .env — ต้องมี Least Privilege ด้วย
      const pass = envMatch && grants.pass;
      envResult = {
        id: "L08-env",
        lab: "Lab08",
        title: ".env ครบและตรงบัญชี",
        pass,
        hint: pass
          ? ""
          : !envMatch
            ? "ใช้ .env จาก starter ของบัญชีนี้ (DB_NAME/DB_USER/DB_PASS ที่ระบบสร้างให้)"
            : "มี .env ถูกแล้ว — ต้องใส่ GRANT Least Privilege ใน user.sql ด้วยถึงจะผ่านข้อนี้",
        expected: `DB_NAME=${dbName}, DB_USER=${username}, DB_PASS ตามที่ระบบสร้าง + GRANT ผ่าน`,
        detail: `DB_NAME=${env.DB_NAME || "?"} DB_USER=${env.DB_USER || "?"} DB_PASS_match=${env.DB_PASS === dbPass} grants=${grants.pass}`,
      };
    }

    const sqlRunResult: CheckResult = !userSql
      ? {
          id: "L08-run-sql",
          lab: "Lab08",
          title: "รัน user.sql",
          pass: false,
          hint: "ใส่ user.sql ใน ZIP",
          expected: "grader รัน user.sql สำเร็จ + มี GRANT Least Privilege",
          detail: "missing user.sql",
        }
      : {
          id: "L08-run-sql",
          lab: "Lab08",
          title: "รัน user.sql",
          // CREATE USER อย่างเดียวไม่นับผ่าน — ต้อง GRANT ครบด้วย
          pass: sqlRanOk && grants.pass && !sqlPassMismatch,
          hint: sqlPassMismatch
            ? "เปิด .env คัดลอกค่า DB_PASS ไปใส่ IDENTIFIED BY '...' ใน user.sql ให้ตรงเป๊ะ"
            : sqlRanOk && grants.pass
              ? ""
              : !sqlRanOk
                ? "แก้ user.sql ให้สร้าง user ของคุณรันได้"
                : "รัน CREATE USER ได้แล้ว — เพิ่ม GRANT SELECT,INSERT,UPDATE,DELETE บน DB ของคุณ",
          expected: "CREATE USER สำเร็จ + IDENTIFIED BY ตรง .env + GRANT Least Privilege",
          detail: `${sqlDetail}; grants=${grants.pass}`,
        };

    const runnerHost = process.env.RUNNER_HOST || "runner";
    const runnerPort = Number(process.env.RUNNER_PORT || "80");
    const runtimeResults = await runRuntimeTests({
      username,
      runnerHost,
      runnerPort,
    });

    // ไม่ให้คะแนนจากมีไฟล์ครบ (ส่ง starter ดิบไม่ไดคะแนนฟรี) — เตือน missing อย่างเดียว
    const results = [envResult, sqlRunResult, grantsResult, ...runtimeResults];
    const passed = results.filter((r) => r.pass).length;

    return NextResponse.json({
      username,
      dbName,
      passed,
      total: results.length,
      missingFiles: fileMatch.missing,
      mysqlUser: username,
      mode: "runtime",
      results,
    });
  });
}

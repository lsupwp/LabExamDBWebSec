import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

/** MySQL database name for a grader username */
export function dbNameFor(username: string): string {
  const safe = username.replace(/[^a-zA-Z0-9_]/g, "");
  return `db_${safe}`;
}

/** App DB password — NOT the Grader login password */
export function generateDbPassword(): string {
  return randomBytes(12).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
}

export function starterEnv(username: string, dbPass: string): string {
  const db = dbNameFor(username);
  return `# .env — ส่งพร้อม ZIP
# DB_PASS ถูกสร้างให้แล้ว (ไม่ใช่รหัส login Grader) — อย่าเปลี่ยนถ้ายังไม่แก้ user.sql ให้ตรง

DB_HOST=db
DB_NAME=${db}
DB_USER=${username}
DB_PASS=${dbPass}
`;
}

export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Strip UTF-8 BOM so DB_NAME=… still parses
  const cleaned = text.replace(/^\uFEFF/, "");
  for (const raw of cleaned.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    // allow `export DB_NAME=…` (shell-style dotenv)
    if (/^export\s+/i.test(line)) line = line.replace(/^export\s+/i, "");
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function rootConn() {
  return mysql.createConnection({
    host: process.env.DB_HOST || "db",
    user: "root",
    password: process.env.DB_ROOT_PASSWORD || "RootPass1234",
    multipleStatements: true,
    connectTimeout: 8000,
  });
}

function schemaSql(): string {
  const candidates = [
    process.env.SCHEMA_FILE,
    path.join(process.cwd(), "schema_body.sql"),
    "/schema/schema_body.sql",
    path.join(process.cwd(), "..", "mysql", "schema_body.sql"),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  throw new Error("schema_body.sql not found");
}

/** Create per-user database + apply lab schema/seed if missing. */
export async function ensureUserDatabase(
  username: string
): Promise<{ ok: boolean; dbName: string; detail: string }> {
  const dbName = dbNameFor(username);
  let conn: mysql.Connection | null = null;
  try {
    conn = await rootConn();
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    const body = schemaSql();
    await conn.query(`USE \`${dbName}\``);
    await conn.query(body);
    return { ok: true, dbName, detail: `database ${dbName} ready` };
  } catch (err) {
    return {
      ok: false,
      dbName,
      detail: `สร้าง DB ไม่สำเร็จ: ${err instanceof Error ? err.message : "error"}`,
    };
  } finally {
    if (conn) await conn.end().catch(() => undefined);
  }
}

/**
 * Drop MySQL app user + recreate empty student DB before each grade.
 * Prevents leftover GRANTs / security_logs from a prior ZIP giving free L08/RT points
 * when the student re-submits an unpatched starter.
 */
export async function resetUserMysqlForGrade(
  username: string
): Promise<{ ok: boolean; dbName: string; detail: string }> {
  const safe = username.replace(/[^a-zA-Z0-9_]/g, "");
  const dbName = dbNameFor(username);
  if (safe !== username) {
    return { ok: false, dbName, detail: "username มีอักขระที่ไม่รองรับ" };
  }
  let conn: mysql.Connection | null = null;
  try {
    conn = await rootConn();
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT User, Host FROM mysql.user WHERE User = ?",
      [username]
    );
    for (const r of rows) {
      const h = String(r.Host).replace(/[`']/g, "");
      await conn.query(`DROP USER IF EXISTS \`${username}\`@\`${h}\``);
    }
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await conn.query(
      `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${dbName}\``);
    await conn.query(schemaSql());
    return { ok: true, dbName, detail: `reset ${dbName} + dropped app user for grade` };
  } catch (err) {
    return {
      ok: false,
      dbName,
      detail: `reset DB ไม่สำเร็จ: ${err instanceof Error ? err.message : "error"}`,
    };
  } finally {
    if (conn) await conn.end().catch(() => undefined);
  }
}

/** Drop student DBs (db_*) and optionally wipe demo — used when resetting lab. */
export async function clearStudentDatabases(): Promise<{ ok: boolean; dropped: string[]; detail: string }> {
  let conn: mysql.Connection | null = null;
  const dropped: string[] = [];
  try {
    conn = await rootConn();
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT SCHEMA_NAME AS name FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME LIKE 'db\\_%'"
    );
    for (const r of rows) {
      const name = String(r.name);
      if (name === "db_labexam") continue; // keep shared demo if present
      await conn.query(`DROP DATABASE IF EXISTS \`${name.replace(/`/g, "")}\``);
      dropped.push(name);
    }
    // Also reset demo schema
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS db_labexam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query("USE db_labexam");
    await conn.query(schemaSql());
    return { ok: true, dropped, detail: `dropped ${dropped.length} student DBs; refreshed db_labexam` };
  } catch (err) {
    return {
      ok: false,
      dropped,
      detail: err instanceof Error ? err.message : "clear failed",
    };
  } finally {
    if (conn) await conn.end().catch(() => undefined);
  }
}

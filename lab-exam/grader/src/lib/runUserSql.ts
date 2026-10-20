import mysql from "mysql2/promise";

const BLOCKED =
  /\b(DROP\s+DATABASE|DROP\s+TABLE|TRUNCATE|DELETE\s+FROM|UPDATE\s+\w+\s+SET|INSERT\s+INTO|ALTER\s+TABLE|CREATE\s+TABLE|CREATE\s+DATABASE|LOAD\s+DATA|INTO\s+OUTFILE|INTO\s+DUMPFILE|INFORMATION_SCHEMA|mysql\.|PERFORMANCE_SCHEMA)\b/i;

const ALLOWED_START =
  /^(CREATE\s+USER|ALTER\s+USER|GRANT\b|REVOKE\b|FLUSH\s+PRIVILEGES)\b/i;

export type RunSqlResult = {
  ok: boolean;
  detail: string;
  statementsRun: number;
};

function splitStatements(sql: string): string[] {
  return sql
    .split("\n")
    .map((line) => {
      const noInline = line.replace(/--.*$/, "");
      return noInline;
    })
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateUserSql(sql: string, username: string): { ok: true; statements: string[] } | { ok: false; detail: string } {
  if (!sql.trim()) return { ok: false, detail: "user.sql ว่าง" };

  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`['\`]${escaped}['\`]`, "i").test(sql)) {
    return {
      ok: false,
      detail: `user.sql ต้องอ้างอิง user ชื่อ '${username}' (ชื่อเดียวกับบัญชี Grader)`,
    };
  }

  if (!/CREATE\s+USER/i.test(sql)) {
    return { ok: false, detail: "user.sql ต้องมี CREATE USER" };
  }

  const statements = splitStatements(sql);
  if (!statements.length) return { ok: false, detail: "ไม่พบคำสั่ง SQL ที่รันได้" };
  if (statements.length > 20) return { ok: false, detail: "คำสั่งใน user.sql มากเกินไป" };

  for (const stmt of statements) {
    if (BLOCKED.test(stmt)) {
      return { ok: false, detail: `คำสั่งไม่อนุญาต: ${stmt.slice(0, 80)}` };
    }
    if (!ALLOWED_START.test(stmt)) {
      return {
        ok: false,
        detail: `อนุญาตเฉพาะ CREATE/ALTER USER, GRANT, REVOKE, FLUSH — ได้: ${stmt.slice(0, 80)}`,
      };
    }
    // Every user-touching statement must mention this username
    if (/^(CREATE|ALTER)\s+USER|^(GRANT|REVOKE)\b/i.test(stmt)) {
      if (!new RegExp(`['\`]${escaped}['\`]`, "i").test(stmt)) {
        return {
          ok: false,
          detail: `คำสั่งต้องเป็นของ user '${username}' เท่านั้น`,
        };
      }
    }
  }

  return { ok: true, statements };
}

export async function runUserSql(sql: string, username: string): Promise<RunSqlResult> {
  const checked = validateUserSql(sql, username);
  if (!checked.ok) return { ok: false, detail: checked.detail, statementsRun: 0 };

  const host = process.env.DB_HOST || "db";
  const rootPass = process.env.DB_ROOT_PASSWORD || "RootPass1234";

  let conn: mysql.Connection | null = null;
  let ran = 0;
  try {
    conn = await mysql.createConnection({
      host,
      user: "root",
      password: rootPass,
      multipleStatements: false,
      connectTimeout: 5000,
    });

    for (const stmt of checked.statements) {
      await conn.query(stmt);
      ran += 1;
    }
    return { ok: true, detail: `รัน user.sql สำเร็จ (${ran} คำสั่ง)`, statementsRun: ran };
  } catch (err) {
    return {
      ok: false,
      detail: `รัน user.sql ไม่สำเร็จ: ${err instanceof Error ? err.message : "db error"}`,
      statementsRun: ran,
    };
  } finally {
    if (conn) await conn.end().catch(() => undefined);
  }
}

/** Extract IDENTIFIED BY '…' from CREATE/ALTER USER (first match). */
export function identifiedByPassword(sql: string): string | null {
  const m =
    sql.match(/IDENTIFIED\s+BY\s+'((?:\\'|[^'])*)'/i) ||
    sql.match(/IDENTIFIED\s+BY\s+"((?:\\"|[^"])*)"/i);
  if (!m) return null;
  return m[1].replace(/\\'/g, "'").replace(/\\"/g, '"');
}

export function starterUserSql(username: string, dbName: string, dbPass: string): string {
  const escaped = dbPass.replace(/'/g, "''");
  return `-- user.sql — ส่งพร้อม ZIP
-- รหัสผ่าน MySQL ถูกสร้างให้แล้ว (ตรงกับ DB_PASS ใน .env — ไม่ใช่รหัส login Grader)
-- งานของคุณ: กำหนดสิทธิ์ Least Privilege เองบน DB_NAME=${dbName}
-- MySQL username ต้องเป็น '${username}' เท่านั้น

CREATE USER IF NOT EXISTS '${username}'@'%' IDENTIFIED BY '${escaped}';

`;
}

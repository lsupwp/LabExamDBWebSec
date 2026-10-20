import "server-only";
import mysql from "mysql2/promise";

/** Root MySQL helper for grader-side probes (Lab03 hash check / Lab05 cleanup). */
export async function rootQuery<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "db",
    user: "root",
    password: process.env.DB_ROOT_PASSWORD || "RootPass1234",
    multipleStatements: true,
  });
  try {
    const [rows] = await conn.query(sql, params);
    return rows as T[];
  } finally {
    await conn.end().catch(() => undefined);
  }
}

export function studentDbName(username: string): string {
  return `db_${username.replace(/[^a-zA-Z0-9_]/g, "")}`;
}

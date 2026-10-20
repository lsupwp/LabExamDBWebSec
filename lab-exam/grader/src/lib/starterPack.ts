import fs from "fs";
import path from "path";

function schemaBody(): string {
  const candidates = [
    process.env.SCHEMA_FILE,
    "/schema/schema_body.sql",
    path.join(process.cwd(), "schema_body.sql"),
    path.join(process.cwd(), "..", "mysql", "schema_body.sql"),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  throw new Error("schema_body.sql not found");
}

/** Full db.sql for student ZIP — auto-runs in MariaDB init (same schema/seed as grader). */
export function starterDbSql(dbName: string): string {
  const safe = dbName.replace(/[^a-zA-Z0-9_]/g, "");
  const body = schemaBody().trim();
  return `-- db.sql — schema + seed (เหมือน grader)
-- Docker Compose โหลดไฟล์นี้เองตอน db ขึ้นครั้งแรก (volume ว่าง)
-- ฐานข้อมูล: ${safe}

CREATE DATABASE IF NOT EXISTS \`${safe}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE \`${safe}\`;

${body}
`;
}

export function studentPackDir(): string {
  const candidates = [
    process.env.STUDENT_PACK_DIR,
    "/student-pack",
    path.join(process.cwd(), "student-pack"),
    path.join(process.cwd(), "..", "student-pack"),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("student-pack dir not found");
}

export function readStudentPackFile(name: string): string {
  return fs.readFileSync(path.join(studentPackDir(), name), "utf8");
}

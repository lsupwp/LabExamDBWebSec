import { EXAM_MSG } from "@/lib/examMessages";
import type { LabDefinition } from "../types";
import {
  formBody,
  hasMarker,
  loginAs,
  loginSucceeded,
  req,
  type RuntimeCtx,
} from "../shared/runtimeKit";
import { rootQuery, studentDbName } from "../shared/rootQuery";

const LOCK_USER = "locktest01";
const LOCK_PASS = "LockPass1a";
/** Must match student checklist — lock after this many failed attempts */
export const LOGIN_LOCK_LIMIT = 5;

async function ensureLockUser(db: string) {
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(LOCK_PASS, 10);
  await rootQuery(
    `INSERT INTO \`${db}\`.residents (username, password_hash, full_name, room_code, phone, role)
     VALUES (?, ?, 'Lock Test', 'Z-999', '0899999999', 'resident')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [LOCK_USER, hash]
  );
}

async function cleanupLockState(db: string) {
  try {
    await rootQuery(`TRUNCATE TABLE \`${db}\`.login_attempts`);
  } catch {
    /* ignore */
  }
  try {
    await rootQuery(`DELETE FROM \`${db}\`.residents WHERE username = ?`, [LOCK_USER]);
  } catch {
    /* ignore */
  }
}

/** Lab05 — lockout เล็กๆ · รันทีหลังสุด · ล้าง attempt หลังจบ */
export const lab05: LabDefinition = {
  id: "Lab05",
  order: 5,
  title: "Login lockout",
  runtime: [
    {
      id: "RT-L05-lockout",
      lab: "Lab05",
      title: `Login ผิด ${LOGIN_LOCK_LIMIT} ครั้งแล้วถูกล็อก`,
      how: `ใน login_process นับแถว login_attempts ที่ success=0 ล่าสุด — ครบ ${LOGIN_LOCK_LIMIT} แล้วห้าม login (แสดง ${EXAM_MSG.LOGIN_LOCKED})`,
      expected: `Example: ผิดรหัส ${LOGIN_LOCK_LIMIT} ครั้ง → รหัสถูกก็เข้าไม่ได้ / มี ${EXAM_MSG.LOGIN_LOCKED}`,
      hint: `INSERT login_attempts ตอนผิด + บล็อกเมื่อครบ ${LOGIN_LOCK_LIMIT}`,
      order: 900,
      async run(ctx: RuntimeCtx, jar) {
        const db = studentDbName(ctx.username);
        try {
          await ensureLockUser(db);
          // clear prior attempts for clean probe
          await rootQuery(`DELETE FROM \`${db}\`.login_attempts WHERE username = ?`, [LOCK_USER]);

          for (let i = 0; i < LOGIN_LOCK_LIMIT; i++) {
            jar.clear();
            await loginAs(ctx, jar, LOCK_USER, "WrongPass99");
          }

          jar.clear();
          const blocked = await loginAs(ctx, jar, LOCK_USER, LOCK_PASS);
          const page = await req(ctx, jar, "/login.php");
          const body = blocked.body + "\n" + page.body;
          const gotIn = loginSucceeded(blocked, jar);
          const hasLockMsg =
            hasMarker(blocked.body, EXAM_MSG.LOGIN_LOCKED) ||
            hasMarker(page.body, EXAM_MSG.LOGIN_LOCKED) ||
            /locked|ล็อก/i.test(body);
          // PASS if correct password cannot get in after N failures
          const pass = !gotIn;
          return {
            pass,
            detail: `gotIn=${gotIn} hasLockMsg=${hasLockMsg} status=${blocked.status}`,
          };
        } finally {
          await cleanupLockState(db);
        }
      },
    },
  ],
};

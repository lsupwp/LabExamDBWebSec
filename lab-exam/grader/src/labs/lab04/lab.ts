import type { LabDefinition } from "../types";
import { loginAs, loginSucceeded, type RuntimeCtx } from "../shared/runtimeKit";

/** Lab04 — เช็คว่า SQLi ที่ login แล้วเข้าได้มั้ย (payload เดียว) */
export const lab04: LabDefinition = {
  id: "Lab04",
  order: 4,
  title: "Login SQLi",
  runtime: [
    {
      id: "RT-L04-login-sqli",
      lab: "Lab04",
      title: "Login ไม่โดน SQLi bypass",
      how: "ใน login_process.php ใช้ prepare + bind_param แทนต่อสตริงใน WHERE username",
      expected: "Example: POST username=`' OR '1'='1` → ห้ามเข้า /repairs.php (ไม่มี session หลัง login สำเร็จ)",
      hint: "prepared statement ที่ username — ห้ามต่อ string",
      order: 40,
      async run(ctx: RuntimeCtx, jar) {
        jar.clear();
        // Avoid `-- ` payloads: login_process trims username and strips the required space.
        const evil = await loginAs(ctx, jar, "' OR '1'='1", "x");
        const bypassed = loginSucceeded(evil, jar);
        return {
          pass: !bypassed,
          detail: `sqliBypass=${bypassed} status=${evil.status} loc=${String(evil.headers.location || "-")}`,
        };
      },
    },
  ],
};

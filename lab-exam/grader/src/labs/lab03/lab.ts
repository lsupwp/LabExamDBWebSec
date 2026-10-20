import type { LabDefinition } from "../types";
import {
  formBody,
  loginAs,
  loginSucceeded,
  req,
  type RuntimeCtx,
} from "../shared/runtimeKit";
import { rootQuery, studentDbName } from "../shared/rootQuery";

/** Lab03 — register ต้อง password_hash ไม่เก็บ plaintext */
export const lab03: LabDefinition = {
  id: "Lab03",
  order: 3,
  title: "Password hashing",
  runtime: [
    {
      id: "RT-L03-password-hash",
      lab: "Lab03",
      title: "Register เก็บ bcrypt ไม่ใช่รหัสดิบ",
      how: "ใน register.php ใช้ password_hash($password, PASSWORD_BCRYPT) แล้ว INSERT เฉพาะ hash — ห้ามเก็บ plaintext",
      expected: "Example: สมัคร user ใหม่ → คอลัมน์ password_hash ขึ้นต้น $2y$/$2a$ และ login ด้วยรหัสเดิมได้",
      hint: "password_hash(..., PASSWORD_BCRYPT) ตอนสมัคร",
      order: 30,
      async run(ctx: RuntimeCtx, jar) {
        jar.clear();
        const uname = `h${Date.now().toString().slice(-7)}`;
        const pass = "HashPass1a";
        const reg = await req(ctx, jar, "/register.php", {
          method: "POST",
          body: formBody({
            username: uname,
            full_name: "Hash User",
            room_code: "B-202",
            phone: "0811111111",
            password: pass,
          }),
        });
        const loc = String(reg.headers.location || "");
        const registered =
          (reg.status >= 300 && reg.status < 400 && /login\.php.*registered/i.test(loc)) ||
          /registered/i.test(reg.body);
        if (!registered) {
          return { pass: false, detail: `register failed status=${reg.status} loc=${loc || "-"}` };
        }

        const db = studentDbName(ctx.username);
        const rows = await rootQuery<{ password_hash: string }>(
          `SELECT password_hash FROM \`${db}\`.residents WHERE username = ? LIMIT 1`,
          [uname]
        );
        const stored = rows[0]?.password_hash || "";
        const isBcrypt = /^\$2[ayb]\$/.test(stored);
        const notPlain = stored !== pass && stored.length > 20;

        jar.clear();
        const login = await loginAs(ctx, jar, uname, pass);
        const canLogin = loginSucceeded(login, jar);

        return {
          pass: isBcrypt && notPlain && canLogin,
          detail: `bcrypt=${isBcrypt} notPlain=${notPlain} login=${canLogin} hashPrefix=${stored.slice(0, 7)}`,
        };
      },
    },
  ],
};

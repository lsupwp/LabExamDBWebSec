import type { LabDefinition } from "../types";
import { followOnce, formBody, req, type RuntimeCtx } from "../shared/runtimeKit";

function registered(res: { status: number; headers: { location?: string | string[] }; body: string }) {
  const loc = String(res.headers.location || "");
  return res.status >= 300 && res.status < 400 && /login\.php.*registered/i.test(loc);
}

/** Lab06 — password policy ฝั่ง PHP */
export const lab06: LabDefinition = {
  id: "Lab06",
  order: 6,
  title: "Password policy",
  runtime: [
    {
      id: "RT-L06-password-policy",
      lab: "Lab06",
      title: "Register ปฏิเสธรหัสที่อ่อน",
      how: "ฝั่ง PHP บังคับรหัส ≥8 มีพิมพ์ใหญ่+เล็ก+ตัวเลข — ไม่พึ่ง HTML pattern",
      expected: "Example: password=short หรือ alllowercase1 → ห้าม redirect registered; GoodPass1 + room ถูก → สมัครได้",
      hint: "ตรวจ password ด้วย preg_match ฝั่งเซิร์ฟเวอร์ก่อน INSERT",
      order: 60,
      async run(ctx: RuntimeCtx, jar) {
        jar.clear();
        const weak = await req(ctx, jar, "/register.php", {
          method: "POST",
          body: formBody({
            username: `w${Date.now().toString().slice(-6)}`,
            full_name: "Weak User",
            room_code: "C-303",
            phone: "0822222222",
            password: "short",
          }),
        });
        const weakOk = registered(weak);

        jar.clear();
        const weak2 = await req(ctx, jar, "/register.php", {
          method: "POST",
          body: formBody({
            username: `w2${Date.now().toString().slice(-5)}`,
            full_name: "Weak Two",
            room_code: "C-304",
            phone: "0833333333",
            password: "alllowercase1",
          }),
        });
        const weak2Ok = registered(weak2);

        jar.clear();
        const strongUser = `s${Date.now().toString().slice(-6)}`;
        const strong = await req(ctx, jar, "/register.php", {
          method: "POST",
          body: formBody({
            username: strongUser,
            full_name: "Strong User",
            room_code: "C-305",
            phone: "0844444444",
            password: "GoodPass1",
          }),
        });
        await followOnce(ctx, jar, strong);
        const strongOk = registered(strong);

        return {
          pass: !weakOk && !weak2Ok && strongOk,
          detail: `weak=${weakOk} weak2=${weak2Ok} strong=${strongOk}`,
        };
      },
    },
  ],
};

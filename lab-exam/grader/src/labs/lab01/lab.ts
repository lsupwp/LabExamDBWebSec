import { EXAM_MSG } from "@/lib/examMessages";
import type { LabDefinition } from "../types";
import { followOnce, formBody, hasMarker, req, type RuntimeCtx } from "../shared/runtimeKit";

/** Lab01 — ไม่โชว์ SQL/mysqli error ให้ผู้ใช้ */
export const lab01: LabDefinition = {
  id: "Lab01",
  order: 1,
  title: "Secure errors",
  runtime: [
    {
      id: "RT-L01-secure-error",
      lab: "Lab01",
      title: "ไม่โชว์ SQL / mysqli error ให้ผู้ใช้",
      how: `เมื่อ DB พัง แสดงข้อความกลาง (เช่น ${EXAM_MSG.GENERIC_ERROR}) + error_log — ห้าม echo $mysqli->error`,
      expected: `Example: GET /register.php?database_error_test=1 → มี ${EXAM_MSG.GENERIC_ERROR} และไม่มีคำว่า mysqli / SQL syntax / Database error:`,
      hint: `แทนที่ข้อความ Database error: … ด้วย ${EXAM_MSG.GENERIC_ERROR}`,
      order: 10,
      async run(ctx: RuntimeCtx, jar) {
        jar.clear();
        const res = await req(ctx, jar, "/register.php?database_error_test=1", {
          method: "POST",
          body: formBody({
            username: `e${Date.now().toString().slice(-6)}`,
            full_name: "Err User",
            room_code: "A-101",
            phone: "0812345678",
            password: "GoodPass1",
          }),
        });
        const page = await followOnce(ctx, jar, res);
        const body = res.body + "\n" + page.body;
        const hasGeneric = hasMarker(body, EXAM_MSG.GENERIC_ERROR);
        // Don't flag instructional page text (e.g. "ห้ามโชว์ $mysqli->error") — only real leaks.
        const leaked =
          /Database error:/i.test(body) ||
          /mysqli_sql_exception/i.test(body) ||
          /SQL syntax.*error/i.test(body) ||
          /Unknown table ['`]?residents_missing/i.test(body) ||
          /Access denied for user/i.test(body);
        return {
          pass: hasGeneric && !leaked,
          detail: `generic=${hasGeneric} leaked=${leaked}`,
        };
      },
    },
  ],
};

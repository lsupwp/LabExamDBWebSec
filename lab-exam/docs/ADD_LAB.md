# เพิ่ม Lab ใหม่ใน Grader

Lab อยู่ใต้ `grader/src/labs/` — ลงทะเบียนใน `index.ts` แล้ว checklist + runtime จะตามอัตโนมัติ

## ขั้นตอนสั้นๆ

1. สร้าง `grader/src/labs/labNN/lab.ts` ส่งออก `LabDefinition`
2. `import` แล้วใส่ใน `ALL_LABS` ใน `grader/src/labs/index.ts` (ตั้ง `order`)
3. แก้ starter ใน `php/www/…` ให้**ไม่ผ่าน**ข้อนั้นจนกว่านักเรียนจะแก้
4. อัปเดต `docs/CHECKLIST.md` · `FIX_GUIDE.md` · `RUNTIME_MESSAGES.md`
5. ถ้ามีข้อความตายตัว → ใส่ใน `grader/src/lib/examMessages.ts` (`EXAM_MSG`)
6. เพิ่มเคสใน `/tmp/grade_matrix_test.py` `patch_pass` + `expect_fail_rt` (ถ้าใช้สคริปต์นี้ตรวจ)
7. `docker compose build grader && docker compose up -d`

## โครง `LabDefinition`

```ts
import type { LabDefinition } from "../types";

export const labNN: LabDefinition = {
  id: "LabNN",
  order: NN,
  title: "…",
  runtime: [
    {
      id: "RT-LNN-…",
      lab: "LabNN",
      title: "…",
      how: "…",
      expected: "…",
      hint: "…",
      order: NN * 10, // Lab05 lockout ใช้ 900 ให้รันทีหลังสุด
      async run(ctx, jar) {
        return { pass: true, detail: "…" };
      },
    },
  ],
};
```

## Helper ที่ใช้ร่วม

- `grader/src/labs/shared/runtimeKit.ts` — `req`, `loginAs`, `loginSucceeded`, `rootQuery`, …
- Lab ที่ต้องอ่าน/ล้าง DB ฝั่ง grader → `rootQuery` + `studentDbName(ctx.username)`

## ลำดับรัน runtime

`allRuntimeCases()` เรียงตาม `case.order` (ไม่มีก็ใช้ `lab.order * 10`)  
**Lab05 lockout ต้อง order สูง (900)** และล้าง `login_attempts` หลังจบ เพื่อไม่บล็อกข้ออื่น

## Lab 02 / 07–12

ยังอยู่ใน `legacyRuntime.ts` — คะแนนเดิม ไม่ต้องย้ายก็ได้  
ถ้าจะย้ายทีหลัง: ตัดเคสจาก legacy → ไฟล์ `labNN/lab.ts` → ลบออกจาก legacy

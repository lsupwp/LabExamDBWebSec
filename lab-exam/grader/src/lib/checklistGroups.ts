import { checklistLabOrder, runtimeChecklistMeta } from "@/labs/index";

export type ChecklistItem = {
  id: string;
  title: string;
  how: string;
  expected: string;
};

export type ChecklistGroup = {
  lab: string;
  items: ChecklistItem[];
};

export function buildChecklistGroups(): ChecklistGroup[] {
  const grants: ChecklistItem[] = [
    {
      id: "L08-env",
      title: ".env ตรงบัญชี (DB_NAME / DB_USER / DB_PASS)",
      how: "ใช้ .env จาก starter ให้ค่าตรงบัญชี — ผ่านเมื่อมี GRANT Least Privilege ด้วย",
      expected: "DB_* ตรงบัญชี + GRANT ผ่าน",
    },
    {
      id: "L08-run-sql",
      title: "รัน user.sql สำเร็จ",
      how: "เพิ่ม GRANT ใน user.sql — CREATE USER อย่างเดียวยังไม่ผ่าน",
      expected: "CREATE USER + GRANT + FLUSH รันสำเร็จ",
    },
    {
      id: "L08-grants",
      title: "สิทธิ์ MySQL ตาม Least Privilege",
      how: "GRANT เฉพาะ SELECT, INSERT, UPDATE, DELETE บน DB ส่วนตัว — ห้าม ALL/DROP/GRANT OPTION",
      expected: "GRANT SELECT, INSERT, UPDATE, DELETE ON `db_คุณ`.* TO 'คุณ'@'%';",
    },
  ];

  const byLab = new Map<string, ChecklistItem[]>();
  for (const m of runtimeChecklistMeta()) {
    const list = byLab.get(m.lab) || [];
    list.push({ id: m.id, title: m.title, how: m.how, expected: m.expected });
    byLab.set(m.lab, list);
  }

  const lab08 = byLab.get("Lab08") || [];
  lab08.unshift(...grants);
  byLab.set("Lab08", lab08);

  const order = checklistLabOrder();
  const groups: ChecklistGroup[] = [];
  for (const lab of order) {
    const items = byLab.get(lab);
    if (items?.length) groups.push({ lab, items });
  }
  for (const [lab, items] of byLab) {
    if (!order.includes(lab)) groups.push({ lab, items });
  }
  return groups;
}

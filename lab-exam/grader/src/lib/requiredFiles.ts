/** Files that must appear in the submission ZIP (basename match). */
export const REQUIRED_FILES: { name: string; why: string }[] = [
  { name: ".env", why: "DB_HOST / DB_NAME / DB_USER / DB_PASS ของฐานข้อมูลส่วนตัวคุณ" },
  { name: "user.sql", why: "CREATE USER + กำหนดสิทธิ์ Least Privilege เอง (grader จะรันไฟล์นี้)" },
  { name: "config.php", why: "session cookie, CSRF, security_log, อ่านค่าจาก .env" },
  { name: "auth_check.php", why: "timeout + User-Agent" },
  { name: "login_process.php", why: "regenerate id, attempt limit, login log" },
  { name: "logout.php", why: "secure logout" },
  { name: "register.php", why: "room/phone regex + password policy" },
  { name: "repairs.php", why: "prepared search (SQLi)" },
  { name: "repair_create.php", why: "validation + prepared INSERT" },
  { name: "repair_edit.php", why: "ownership" },
  { name: "repair_actions.php", why: "cancel + ownership + CSRF" },
  { name: "repair_view.php", why: "secure upload" },
  { name: "announcements.php", why: "XSS encoding + CSRF form" },
  { name: "announcement_actions.php", why: "CSRF on comment POST" },
  { name: "download.php", why: "download authz" },
  { name: "admin_logs.php", why: "admin-only logs" },
];

export type FileMatchResult = {
  id: string;
  lab: string;
  title: string;
  pass: boolean;
  hint: string;
  expected: string;
  detail?: string;
};

export function matchRequiredFiles(paths: string[]): {
  results: FileMatchResult[];
  found: Set<string>;
  missing: string[];
} {
  const basenames = new Set(
    paths.map((p) => {
      const norm = p.replace(/\\/g, "/");
      return norm.includes("/") ? norm.slice(norm.lastIndexOf("/") + 1) : norm;
    })
  );

  const missing: string[] = [];
  const found = new Set<string>();
  const results: FileMatchResult[] = REQUIRED_FILES.map((f) => {
    const ok = basenames.has(f.name);
    if (ok) found.add(f.name);
    else missing.push(f.name);
    return {
      id: `FILE-${f.name}`,
      lab: "ZIP",
      title: `มีไฟล์ ${f.name}`,
      pass: ok,
      hint: ok
        ? ""
        : `ใส่ ${f.name} ใน ZIP (โครง www/ หรือ www/includes/ ก็ได้ ตรวจจากชื่อไฟล์)`,
      expected: `${f.name} — ${f.why}`,
      detail: ok ? undefined : "filename not found in zip",
    };
  });

  return { results, found, missing };
}

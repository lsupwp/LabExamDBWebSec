export type CheckResult = {
  id: string;
  lab: string;
  title: string;
  pass: boolean;
  hint: string;
  expected: string;
  detail?: string;
};

export type FileMap = Record<string, string>;

type Rule = {
  id: string;
  lab: string;
  title: string;
  files: string[];
  must?: RegExp[];
  mustNot?: RegExp[];
  hint: string;
  expected: string;
  test?: (files: FileMap) => boolean;
};

function readJoined(files: FileMap, names: string[]): string {
  return names.map((n) => files[n] ?? "").join("\n");
}

function findFile(files: FileMap, candidates: string[]): string | null {
  for (const c of candidates) {
    if (files[c] !== undefined) return c;
    const hit = Object.keys(files).find((k) => k.endsWith("/" + c) || k === c);
    if (hit) return hit;
  }
  return null;
}

function normalizeMap(input: FileMap): FileMap {
  const out: FileMap = {};
  for (const [k, v] of Object.entries(input)) {
    const norm = k.replace(/\\/g, "/").replace(/^\.\//, "");
    const base = norm.includes("/") ? norm.slice(norm.lastIndexOf("/") + 1) : norm;
    out[norm] = v;
    if (!out[base]) out[base] = v;
  }
  return out;
}

const RULES: Rule[] = [
  {
    id: "L02-form-method",
    lab: "Lab02",
    title: "Forms มี method=\"post\" หรือ method=\"get\" ตามการใช้งาน",
    files: [
      "login.php",
      "register.php",
      "logout.php",
      "layout.php",
      "includes/layout.php",
      "repair_create.php",
      "repair_edit.php",
      "repair_view.php",
      "announcements.php",
      "repairs.php",
    ],
    must: [/method\s*=\s*["']post["']/i],
    hint: "Starter ตัด method ออกแล้ว — ใส่ method=\"post\" ให้ form ที่เปลี่ยนข้อมูล และ method=\"get\" ถ้าเป็นค้นหา",
    expected: "form ที่ state-changing ต้องมี method=\"post\" (default ของ browser คือ GET)",
    test: (files) => {
      const joined = Object.values(files).join("\n");
      const postOk = (joined.match(/method\s*=\s*["']post["']/gi) || []).length >= 4;
      const search = readJoined(files, ["repairs.php"]);
      const getOk = !search || /method\s*=\s*["']get["']/i.test(search) || !/<form[\s\S]*name=["']q["']/.test(search);
      // if search form exists, prefer get
      if (/<form[^>]*action=["']\/repairs\.php["']/i.test(search) || /name=["']q["']/.test(search)) {
        return postOk && /method\s*=\s*["']get["']/i.test(search);
      }
      return postOk;
    },
  },
  {
    id: "L07-cookie",
    lab: "Lab07",
    title: "Session cookie flags (HttpOnly + SameSite) before session_start",
    files: ["config.php", "includes/config.php"],
    must: [
      /session_set_cookie_params/i,
      /httponly\s*=>\s*true/i,
      /samesite\s*=>\s*['"]Lax['"]|['"]Strict['"]/i,
      /session_start\s*\(/i,
    ],
    hint: "ใน includes/config.php เรียก session_set_cookie_params([... 'httponly'=>true, 'samesite'=>'Lax']) ก่อน session_start()",
    expected: "Cookie PHPSESSID มี HttpOnly และ SameSite=Lax/Strict",
  },
  {
    id: "L07-regen",
    lab: "Lab07",
    title: "session_regenerate_id after successful login",
    files: ["login_process.php"],
    must: [/session_regenerate_id\s*\(\s*true\s*\)/],
    hint: "หลัง password ถูกต้อง เรียก session_regenerate_id(true) ก่อนตั้ง $_SESSION",
    expected: "Session ID ก่อน/หลัง login ต้องต่างกัน",
  },
  {
    id: "L07-attempts",
    lab: "Lab07",
    title: "Login attempt limiting uses login_attempts",
    files: ["login_process.php"],
    must: [
      /INSERT\s+INTO\s+login_attempts/i,
      /FROM\s+login_attempts/i,
      /LOGIN_MAX_ATTEMPTS/,
    ],
    hint: "นับ failed login ในตาราง login_attempts แล้วบล็อกเมื่อเกิน LIMIT ในหน้าต่างเวลา",
    expected: "ผิดครบจำนวนที่กำหนดแล้วถูกระงับแม้ใส่รหัสถูก",
  },
  {
    id: "L07-timeout-ua",
    lab: "Lab07",
    title: "Idle/Absolute timeout + User-Agent check",
    files: ["auth_check.php", "includes/auth_check.php"],
    must: [/IDLE_TIMEOUT|last_activity/i, /ABSOLUTE_TIMEOUT|login_time/i, /HTTP_USER_AGENT|user_agent/i],
    hint: "ใน auth_check ตรวจ last_activity, login_time และ User-Agent แล้วบังคับ logout ถ้าไม่ผ่าน",
    expected: "timeout หรือ UA เปลี่ยน → กลับหน้า login",
  },
  {
    id: "L07-logout",
    lab: "Lab07",
    title: "Secure logout destroys session cookie",
    files: ["logout.php"],
    must: [/session_destroy\s*\(/i, /setcookie\s*\(/i],
    hint: "logout รับเฉพาะ POST (+CSRF), ล้าง session, หมดอายุ cookie, session_destroy, Cache-Control",
    expected: "หลัง logout กด Back แล้วไม่เห็นหน้าระบบจาก cache",
  },
  {
    id: "L08-prepared-search",
    lab: "Lab08",
    title: "Admin repair search uses prepared statement",
    files: ["repairs.php"],
    must: [/->\s*prepare\s*\(/i, /bind_param/i],
    mustNot: [/LIKE '%"\s*\.\s*\$|LIKE '%'\s*\.\s*\$q/i],
    hint: "อย่าต่อ string SQL จาก \$q ใช้ prepare + bind_param",
    expected: "ใส่ payload คล้าย SQLi แล้วไม่ดึงทุกใบแจ้งซ่อม",
  },
  {
    id: "L08-config-dbuser",
    lab: "Lab08",
    title: "config.php ใช้ MySQL user ชื่อเดียวกับบัญชี Grader (ไม่ใช่ root)",
    files: ["config.php", "includes/config.php"],
    mustNot: [/\$dbUser\s*=\s*getenv\(\s*['"]DB_USER['"]\s*\)\s*\?:\s*['"]root['"]/],
    hint: "ตั้ง \$dbUser ใน config ให้ตรงชื่อบัญชี Grader (รหัสผ่านตรงกับใน user.sql)",
    expected: "\$dbUser ตรงกับ username Grader และไม่ default เป็น root",
  },
  {
    id: "L09-room-regex",
    lab: "Lab09",
    title: "Room code validated with preg_match (regex)",
    files: ["register.php"],
    must: [/preg_match\s*\(/i, /room_code|ROOM_CODE/i],
    hint: "ใช้ preg_match กับรูปแบบเช่น /^[A-Z]-\\d{3}$/ ตรวจรหัสห้องฝั่งเซิร์ฟเวอร์",
    expected: "room_code แปลก เช่น a101 หรือ AA-1 ถูกปฏิเสธ",
  },
  {
    id: "L09-password-phone",
    lab: "Lab09",
    title: "Password policy + phone regex server-side",
    files: ["register.php"],
    must: [/preg_match\s*\(/i, /password/i, /phone/i],
    hint: "ตรวจเบอร์ด้วย regex และ password ≥8 มี upper/lower/digit ฝั่ง PHP",
    expected: "รหัสอ่อน / เบอร์ผิดรูปแบบ สมัครไม่ได้",
    test: (files) => {
      const src = readJoined(files, ["register.php"]);
      const pregCount = (src.match(/preg_match\s*\(/g) || []).length;
      return pregCount >= 2 && /[A-Z].*[a-z]|ctype_upper|password/i.test(src);
    },
  },
  {
    id: "L09-ticket-validation",
    lab: "Lab09",
    title: "Repair create has server-side validation + prepared INSERT",
    files: ["repair_create.php"],
    must: [/ALLOWED_REPAIR_CATEGORIES|in_array\s*\(/i, /->\s*prepare\s*\(/i, /bind_param/i],
    mustNot: [/Database error:\s*'\s*\.\s*\$mysqli->error/i],
    hint: "allowlist category + length ของ title/description และ INSERT ด้วย prepare; error ใช้ error_log",
    expected: "category นอก allowlist ไม่ถูกบันทึก",
  },
  {
    id: "L09-secure-error",
    lab: "Lab09",
    title: "Secure error handling on register/search",
    files: ["register.php", "repairs.php"],
    must: [/error_log\s*\(/i],
    mustNot: [/Database error:\s*'\s*\.\s*\$mysqli->error|SQL Error:\s*'\s*\.\s*\$mysqli->error/i],
    hint: "แสดงข้อความกลาง ๆ + error_log รายละเอียด ห้ามโชว์ \$mysqli->error",
    expected: "?database_error_test=1 ไม่โชว์ SQL ในเบราว์เซอร์",
  },
  {
    id: "L10-ownership",
    lab: "Lab10",
    title: "Repair edit/cancel checks ownership or admin",
    files: ["repair_edit.php", "repair_actions.php"],
    must: [/resident_id/i, /admin/i],
    hint: "แก้/ยกเลิกได้เฉพาะเจ้าของใบ (resident_id) หรือ admin",
    expected: "resident01 แก้/ยกเลิกใบของ resident02 ไม่ได้",
    test: (files) => {
      const edit = readJoined(files, ["repair_edit.php"]);
      const act = readJoined(files, ["repair_actions.php"]);
      return /resident_id/i.test(edit) && /resident_id/i.test(act) && /admin/i.test(edit + act);
    },
  },
  {
    id: "L10-xss-encode",
    lab: "Lab10",
    title: "Announcement comment output encoding",
    files: ["announcements.php"],
    must: [/h\s*\(\s*\$c\s*\[\s*['"]comment['"]\s*\]|htmlspecialchars\s*\(\s*\$c\s*\[\s*['"]comment['"]/i],
    mustNot: [/echo\s+\$c\s*\[\s*['"]comment['"]\s*\]\s*;/],
    hint: "อย่า echo \$c['comment'] ดิบ ใช้ <?= h(\$c['comment']) ?>",
    expected: "คอมเมนต์ที่มี <script> แสดงเป็นข้อความ",
  },
  {
    id: "L11-csrf-helpers",
    lab: "Lab11",
    title: "Real CSRF token generate + hash_equals verify",
    files: ["config.php", "includes/config.php"],
    must: [/random_bytes|bin2hex/i, /hash_equals\s*\(/i, /csrf_token/i],
    mustNot: [/function\s+verify_csrf[\s\S]{0,120}return\s+true\s*;/i],
    hint: "สร้าง token ด้วย random_bytes เก็บใน session ตรวจด้วย hash_equals",
    expected: "POST ไม่มี token → ปฏิเสธ",
  },
  {
    id: "L11-csrf-forms",
    lab: "Lab11",
    title: "State-changing forms include CSRF field",
    files: ["announcements.php", "repair_actions.php", "logout.php", "repair_view.php", "repair_edit.php", "repair_create.php"],
    must: [/csrf_field\s*\(|name=["']csrf_token["']/i],
    hint: "ทุก form POST สำคัญต้องมี csrf_field() หรือ input csrf_token",
    expected: "ดู HTML form แล้วมี hidden csrf_token",
  },
  {
    id: "L11-admin-logs",
    lab: "Lab11",
    title: "Security logs page requires admin role",
    files: ["admin_logs.php"],
    must: [/['"]admin['"]/, /403|forbidden|Location:/i],
    mustNot: [/INSECURE:\s*no admin role check/i],
    hint: "ถ้า role !== 'admin' ให้ 403 หรือเด้งออก",
    expected: "resident01 เปิด /admin_logs.php ไม่ได้",
  },
  {
    id: "L12-secure-upload",
    lab: "Lab12",
    title: "Secure photo upload: size 2MB + MIME + rename + outside web root",
    files: ["repair_view.php"],
    must: [
      /finfo|mime_content_type/i,
      /ALLOWED_UPLOAD_EXT|pathinfo/i,
      /MAX_UPLOAD_BYTES|2097152|2_097_152/i,
      /uploads_secure/i,
      /bin2hex\s*\(\s*random_bytes|uniqid/i,
    ],
    mustNot: [/uploads_insecure/i],
    hint: "จำกัด 2MB, allowlist jpg/png, MIME จริง, ชื่อใหม่, เก็บ /var/www/uploads_secure",
    expected: "อัปโหลดชนิดไม่อนุญาตไม่ได้ และไฟล์ไม่เปิดตรงจาก URL public",
  },
  {
    id: "L12-download-authz",
    lab: "Lab12",
    title: "Download enforces ticket owner or admin",
    files: ["download.php"],
    must: [
      /ticket_owner|resident_id/i,
      /===?\s*['"]admin['"]|is_admin\s*\(/i,
      /403|forbidden|exit\s*\(/i,
    ],
    hint: "อนุญาตเมื่อเป็นเจ้าของใบแจ้งซ่อมหรือ admin เท่านั้น + ควร log FILE_DOWNLOAD",
    expected: "resident อื่นดาวน์โหลดรูปใบแจ้งซ่อมคนอื่นไม่ได้",
    test: (files) => {
      const src = readJoined(files, ["download.php"]);
      return /\$user/.test(src) && /(ticket_owner|resident_id).{0,80}\$user|\$user.{0,80}(ticket_owner|resident_id)/s.test(src);
    },
  },
  {
    id: "L12-security-log",
    lab: "Lab12",
    title: "security_log writes LOGIN events (no passwords)",
    files: ["config.php", "includes/config.php", "login_process.php"],
    must: [/INSERT\s+INTO\s+security_logs|function\s+security_log/i],
    mustNot: [/function\s+security_log[\s\S]{0,80}placeholder/i],
    hint: "implement security_log() ให้ INSERT และเรียก LOGIN_SUCCESS/FAILED (และ FILE_DOWNLOAD)",
    expected: "login ผิด/ถูกมีแถวใน security_logs โดยไม่มีรหัสผ่าน",
    test: (files) => {
      const cfg = readJoined(files, ["config.php", "includes/config.php"]);
      const login = readJoined(files, ["login_process.php"]);
      const implemented = /INSERT\s+INTO\s+security_logs/i.test(cfg);
      const used = /security_log\s*\(/i.test(login);
      return implemented && used;
    },
  },
];

export type CheckContext = {
  /** Grader login username — also expected MySQL app user name */
  username?: string;
  /** Per-user database name e.g. db_std64001 */
  dbName?: string;
};

export function runChecks(rawFiles: FileMap, ctx: CheckContext = {}): CheckResult[] {
  const files = normalizeMap(rawFiles);
  return RULES.map((rule) => {
    const resolved = rule.files.map((f) => findFile(files, [f]) ?? f);
    const joined = readJoined(files, resolved);

    let pass = true;
    const missing: string[] = [];

    if (rule.must) {
      for (const re of rule.must) {
        if (!re.test(joined)) {
          pass = false;
          missing.push(`missing /${re.source}/`);
        }
      }
    }
    if (rule.mustNot) {
      for (const re of rule.mustNot) {
        if (re.test(joined)) {
          pass = false;
          missing.push(`forbidden /${re.source}/`);
        }
      }
    }
    if (rule.test && !rule.test(files)) {
      pass = false;
      missing.push("custom test failed");
    }

    // Per-student DB user in config
    if (rule.id === "L08-config-dbuser" && ctx.username) {
      const re = new RegExp(
        String.raw`\$dbUser\s*=\s*['"]${ctx.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`
      );
      if (!re.test(joined)) {
        pass = false;
        missing.push(`config must set $dbUser = '${ctx.username}'`);
      }
    }

    const anyPresent = rule.files.some((f) => findFile(files, [f]));
    if (!anyPresent) {
      pass = false;
      missing.push("file not found: " + rule.files.join(" | "));
    }

    return {
      id: rule.id,
      lab: rule.lab,
      title:
        rule.id === "L08-config-dbuser" && ctx.username
          ? `config.php ใช้ MySQL user '${ctx.username}' (ไม่ใช่ root)`
          : rule.title,
      pass,
      hint:
        rule.id === "L08-config-dbuser" && ctx.username
          ? `สร้าง MySQL user '${ctx.username}' แล้วตั้ง $dbUser = '${ctx.username}' ใน includes/config.php`
          : rule.hint,
      expected: rule.expected,
      detail: missing.length ? missing.join("; ") : undefined,
    };
  });
}

export function checklistMeta() {
  return RULES.map((r) => ({
    id: r.id,
    lab: r.lab,
    title: r.title,
    hint: r.hint,
    expected: r.expected,
    files: r.files,
  }));
}

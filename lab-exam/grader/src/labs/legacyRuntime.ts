import { EXAM_MSG } from "@/lib/examMessages";
import type { RuntimeCase } from "./types";
import {
  followOnce,
  formBody,
  hasMarker,
  isAppOk,
  loginAs,
  loginSucceeded,
  looksLikeLoginPage,
  multipartUpload,
  req,
  TINY_PNG,
} from "./shared/runtimeKit";

/** Existing scored labs Lab02, Lab07–Lab12 (order 20–120). */
export const legacyRuntimeCases: RuntimeCase[] = [

  {
    id: "RT-L02-login-post",
    lab: "Lab02",
    title: "Login ใช้ POST แล้วเข้าสู่ระบบได้",
    how: "ใน login.php ใส่ method=\"post\" ให้ form ชี้ /login_process.php — form อื่นที่เปลี่ยนข้อมูลก็ใส่ post / ฟอร์มค้นหาใส่ get",
    expected:
      "Example: หน้า login มี method=\"post\" + POST resident01/Resident1234 → 302 /repairs.php + PHPSESSID",
    hint: "ใส่ method=\"post\" ใน form login — starter ตัดไว้ให้ทำเอง (Lab02)",
    async run(ctx, jar) {
      jar.clear();
      const page = await req(ctx, jar, "/login.php");
      if (!looksLikeLoginPage(page.status, page.body)) {
        return { pass: false, detail: `login page not available status=${page.status}` };
      }
      // Require method=post on the login form itself (action → login_process), not a decoy form
      const formHasPost =
        /<form[^>]*method\s*=\s*["']post["'][^>]*action\s*=\s*["'][^"']*login_process\.php["']/i.test(
          page.body
        ) ||
        /<form[^>]*action\s*=\s*["'][^"']*login_process\.php["'][^>]*method\s*=\s*["']post["']/i.test(
          page.body
        );
      const res = await loginAs(ctx, jar, "resident01", "Resident1234");
      const loc = String(res.headers.location || "");
      const okLogin = loginSucceeded(res, jar);
      return {
        pass: formHasPost && okLogin,
        detail: `formPost=${formHasPost} status=${res.status} loc=${loc || "-"} sid=${Boolean(jar.get("PHPSESSID"))}`,
      };
    },
  },
  {
    id: "RT-L07-cookie-flags",
    lab: "Lab07",
    title: "Cookie session มี HttpOnly",
    how: "ใน includes/config.php เรียก session_set_cookie_params([..., 'httponly'=>true, 'samesite'=>'Lax']) ก่อน session_start()",
    expected: "Example header: Set-Cookie: PHPSESSID=abc...; path=/; HttpOnly (ควรมี SameSite=Lax/Strict ด้วย)",
    hint: "session_set_cookie_params ก่อน session_start",
    async run(ctx, jar) {
      jar.clear();
      const res = await req(ctx, jar, "/login.php");
      if (!looksLikeLoginPage(res.status, res.body)) {
        return { pass: false, detail: `login page not available status=${res.status}` };
      }
      const line = res.setCookie.find((c) => /PHPSESSID/i.test(c)) || "";
      return { pass: /httponly/i.test(line), detail: line.slice(0, 180) || "no set-cookie" };
    },
  },
  {
    id: "RT-L07-regen",
    lab: "Lab07",
    title: "Session ID เปลี่ยนหลัง login",
    how: "ใน login_process.php หลัง password_verify ผ่าน ให้เรียก session_regenerate_id(true) ก่อนตั้ง $_SESSION",
    expected: "Example: PHPSESSID ก่อน login เป็นค่า A หลัง login เป็นค่า B (A ≠ B)",
    hint: "session_regenerate_id(true) หลัง auth สำเร็จ",
    async run(ctx, jar) {
      jar.clear();
      const pre = await req(ctx, jar, "/login.php");
      if (!looksLikeLoginPage(pre.status, pre.body)) {
        return { pass: false, detail: `login page not available status=${pre.status}` };
      }
      const before = jar.get("PHPSESSID") || "";
      const post = await loginAs(ctx, jar, "resident01", "Resident1234");
      if (!loginSucceeded(post, jar)) return { pass: false, detail: "login failed" };
      const after = jar.get("PHPSESSID") || "";
      return {
        pass: Boolean(before && after && before !== after),
        detail: `before=${before.slice(0, 10)} after=${after.slice(0, 10)}`,
      };
    },
  },
  {
    id: "RT-L08-sqli",
    lab: "Lab08",
    title: "ค้นหาไม่ถูก SQLi ดึงทุกแถว",
    how: "ใน repairs.php เปลี่ยนค้นหาจากต่อ string เป็น $mysqli->prepare + bind_param — ห้ามโชว์ SQL / $mysqli->error ให้ผู้ใช้",
    expected:
      "Example: GET /repairs.php?q=' OR '1'='1 (หลัง login admin01) → ไม่ดึงใบครบทุกใบ และไม่มีข้อความ SQL syntax / mysqli error",
    hint: "ใช้ prepared statement + bind_param",
    async run(ctx, jar) {
      jar.clear();
      const login = await loginAs(ctx, jar, "admin01", "Admin1234");
      if (!loginSucceeded(login, jar)) return { pass: false, detail: "admin login failed" };
      const base = await req(ctx, jar, "/repairs.php");
      if (!isAppOk(base.body) || base.status !== 200) {
        return { pass: false, detail: `repairs unavailable status=${base.status}` };
      }
      if (!/ใบแจ้งซ่อม|repair/i.test(base.body)) {
        return { pass: false, detail: "repairs page content missing" };
      }
      const countTitles = (body: string) =>
        (body.match(/น้ำหยดใต้ซิงค์/g) || []).length +
        (body.match(/ไฟห้องน้ำดับ/g) || []).length;
      const baseline = countTitles(base.body);
      // Seed titles must render — otherwise hiding titles could fake a PASS
      if (baseline < 2) {
        return { pass: false, detail: `baselineTitles=${baseline} (need seed titles visible)` };
      }
      const evil = encodeURIComponent("' OR '1'='1");
      const res = await req(ctx, jar, `/repairs.php?q=${evil}`);
      if (!isAppOk(res.body) || res.status !== 200) {
        return { pass: false, detail: `sqli probe unavailable status=${res.status}` };
      }
      const hits = countTitles(res.body);
      const sqlLeak = /SQL syntax|mysqli_sql_exception/i.test(res.body);
      // Vulnerable LIKE concat returns all rows (hits≈baseline); prepared → 0/few
      return {
        pass: hits < 2 && !sqlLeak,
        detail: `baseline=${baseline} evilHits=${hits} sqlLeak=${sqlLeak}`,
      };
    },
  },
  {
    id: "RT-L09-room-regex",
    lab: "Lab09",
    title: "Register ปฏิเสธ room_code ผิดรูปแบบ",
    how: `ใน register.php ใช้ preg_match('/^[A-Z]-\\d{3}$/', $room) ฝั่งเซิร์ฟเวอร์ — ถ้าไม่ผ่านให้ใส่ข้อความในหน้า (เช่น $errors[]) แล้วไม่ INSERT`,
    expected: `Example response body ต้องมีข้อความเป๊ะ: ${EXAM_MSG.ROOM_INVALID} (เทสส่ง room_code=a101) — ห้าม redirect ไป login?msg=registered`,
    hint: `แสดง "${EXAM_MSG.ROOM_INVALID}" เมื่อ room ผิด — ดู RUNTIME_MESSAGES.md`,
    async run(ctx, jar) {
      jar.clear();
      const res = await req(ctx, jar, "/register.php", {
        method: "POST",
        body: formBody({
          username: `t${Date.now().toString().slice(-6)}`,
          full_name: "Test User",
          room_code: "a101",
          phone: "0812345678",
          password: "Abcdefg1",
        }),
      });
      const page = await followOnce(ctx, jar, res);
      if (!isAppOk(page.body) && !hasMarker(page.body, EXAM_MSG.ROOM_INVALID)) {
        return { pass: false, detail: "app fatal on register" };
      }
      const loc = String(res.headers.location || "");
      const registered =
        res.status >= 300 && res.status < 400 && /login\.php.*registered/i.test(loc);
      const marker = hasMarker(res.body, EXAM_MSG.ROOM_INVALID) || hasMarker(page.body, EXAM_MSG.ROOM_INVALID);
      return {
        pass: marker && !registered,
        detail: `marker=${marker} registered=${registered} status=${res.status}`,
      };
    },
  },
  {
    id: "RT-L10-xss",
    lab: "Lab10",
    title: "คอมเมนต์ XSS ถูก encode ตอนแสดง",
    how: "ใน announcements.php แสดงคอมเมนต์ด้วย <?= h($c['comment']) ?> หรือ htmlspecialchars — ห้าม echo ดิบ",
    expected:
      "Example: หลังโพสต์ <script>alert('xss')</script> หน้าต้องมี &lt;script และห้ามมีแท็ก <script>alert('xss')</script> ดิบ",
    hint: "ใช้ h()/htmlspecialchars ตอนแสดงคอมเมนต์",
    async run(ctx, jar) {
      jar.clear();
      const login = await loginAs(ctx, jar, "resident01", "Resident1234");
      if (!loginSucceeded(login, jar)) return { pass: false, detail: "login failed" };
      const page = await req(ctx, jar, "/announcements.php");
      if (!isAppOk(page.body) || page.status !== 200) {
        return { pass: false, detail: `announcements unavailable status=${page.status}` };
      }
      const token =
        page.body.match(/name=["']csrf_token["'][^>]*value=["']([^"']+)/i)?.[1] ||
        page.body.match(/value=["']([^"']+)["'][^>]*name=["']csrf_token["']/i)?.[1] ||
        "";
      const aid =
        page.body.match(/name=["']announcement_id["'][^>]*value=["'](\d+)/i)?.[1] || "1";
      const payload = `<script>alert('xss')</script>`;
      const data: Record<string, string> = {
        action: "comment",
        announcement_id: aid,
        comment: payload,
      };
      if (token) data.csrf_token = token;
      await req(ctx, jar, "/announcement_actions.php", {
        method: "POST",
        body: formBody(data),
      });
      const again = await req(ctx, jar, "/announcements.php");
      if (!isAppOk(again.body)) return { pass: false, detail: "app fatal after comment" };
      const raw = again.body.includes("<script>alert('xss')</script>");
      const encoded = again.body.includes("&lt;script");
      return { pass: !raw && encoded, detail: `rawScript=${raw} encoded=${encoded}` };
    },
  },
  {
    id: "RT-L11-csrf",
    lab: "Lab11",
    title: "POST ไม่มี CSRF ถูกปฏิเสธ",
    how: `ทำ verify_csrf จริง (random_bytes + hash_equals) ใส่ csrf ใน form — ใน announcement_actions.php ถ้าไม่ผ่าน: http_response_code(403); exit('${EXAM_MSG.CSRF_REJECTED}');`,
    expected: `Example response: HTTP 403 body = ${EXAM_MSG.CSRF_REJECTED} (เทส POST comment โดยไม่ส่ง csrf_token) และคอมเมนต์ไม่ถูกบันทึก`,
    hint: `ไม่มี/ผิด token → ตอบ "${EXAM_MSG.CSRF_REJECTED}" — ดู RUNTIME_MESSAGES.md`,
    async run(ctx, jar) {
      jar.clear();
      const login = await loginAs(ctx, jar, "resident01", "Resident1234");
      if (!loginSucceeded(login, jar)) return { pass: false, detail: "login failed" };
      const marker = `csrf-probe-${Date.now()}`;
      const res = await req(ctx, jar, "/announcement_actions.php", {
        method: "POST",
        body: formBody({
          action: "comment",
          announcement_id: "1",
          comment: marker,
        }),
      });
      const page = await followOnce(ctx, jar, res);
      const hasCsrfMsg =
        hasMarker(res.body, EXAM_MSG.CSRF_REJECTED) ||
        hasMarker(page.body, EXAM_MSG.CSRF_REJECTED);
      const list = await req(ctx, jar, "/announcements.php");
      if (!isAppOk(list.body)) return { pass: false, detail: "app fatal on announcements" };
      const saved = list.body.includes(marker);
      return {
        pass: hasCsrfMsg && !saved,
        detail: `hasMsg=${hasCsrfMsg} saved=${saved} status=${res.status}`,
      };
    },
  },
  {
    id: "RT-L11-admin-logs",
    lab: "Lab11",
    title: "resident เปิด admin_logs ไม่ได้",
    how: `ใน admin_logs.php หลัง require_login ถ้า role !== 'admin' ให้ http_response_code(403); exit('${EXAM_MSG.FORBIDDEN}');`,
    expected: `Example response: HTTP 403 body = ${EXAM_MSG.FORBIDDEN} (เทสด้วย resident01) และหน้าไม่มีตาราง Security Audit Log`,
    hint: `role !== admin → ตอบ "${EXAM_MSG.FORBIDDEN}" — ดู RUNTIME_MESSAGES.md`,
    async run(ctx, jar) {
      jar.clear();
      const login = await loginAs(ctx, jar, "resident01", "Resident1234");
      if (!loginSucceeded(login, jar)) return { pass: false, detail: "login failed" };
      const res = await req(ctx, jar, "/admin_logs.php");
      const page = await followOnce(ctx, jar, res);
      const body = res.body + "\n" + page.body;
      const hasForbid = hasMarker(body, EXAM_MSG.FORBIDDEN);
      const showsTable = /Security Audit Log/i.test(body) && /<table/i.test(body);
      return {
        pass: hasForbid && !showsTable,
        detail: `hasMsg=${hasForbid} showsTable=${showsTable} status=${res.status}`,
      };
    },
  },
  {
    id: "RT-L12-upload-reject",
    lab: "Lab12",
    title: "อัปโหลดไฟล์ชนิดผิดถูกปฏิเสธ",
    how: `ใน repair_view.php ตรวจนามสกุล jpg/png + MIME จริง (finfo) + ขนาด ≤2MB — ถ้าไม่ผ่าน: แสดง ${EXAM_MSG.UPLOAD_REJECTED} และห้ามเก็บใน uploads_insecure`,
    expected: `Example: POST อัปโหลด shell.php → หน้ามี ${EXAM_MSG.UPLOAD_REJECTED} และไม่มีข้อความอัปโหลดไป /uploads_insecure/`,
    hint: `ชนิดผิด → "${EXAM_MSG.UPLOAD_REJECTED}" + เก็บ /var/www/uploads_secure ชื่อสุ่ม`,
    async run(ctx, jar) {
      jar.clear();
      const login = await loginAs(ctx, jar, "resident01", "Resident1234");
      if (!loginSucceeded(login, jar)) return { pass: false, detail: "login failed" };
      const mp = multipartUpload(
        { action: "upload" },
        {
          field: "photo",
          filename: "shell.php",
          contentType: "application/x-php",
          data: Buffer.from("<?php echo 'pwn';"),
        }
      );
      const res = await req(ctx, jar, "/repair_view.php?id=1", {
        method: "POST",
        body: mp.body,
        contentType: mp.contentType,
      });
      const page = await followOnce(ctx, jar, res);
      const body = res.body + "\n" + page.body;
      const rejected = hasMarker(body, EXAM_MSG.UPLOAD_REJECTED);
      const insecureOk = /อัปโหลดไปที่\s*\/uploads_insecure/i.test(body);
      return {
        pass: rejected && !insecureOk,
        detail: `rejected=${rejected} insecureOk=${insecureOk} status=${res.status}`,
      };
    },
  },
  {
    id: "RT-L12-download-authz",
    lab: "Lab12",
    title: "resident อื่นดาวน์โหลดไฟล์ใบคนอื่นไม่ได้",
    how: `ใน download.php อนุญาตเฉพาะเจ้าของใบแจ้งซ่อมหรือ admin — ไม่งั้น http_response_code(403); exit('${EXAM_MSG.FORBIDDEN}');`,
    expected: `Example: resident01 อัปโหลดรูปใบ #1 แล้ว resident02 GET /download.php?id=… → ${EXAM_MSG.FORBIDDEN}`,
    hint: `ตรวจ ticket_owner กับ user id / is_admin — ปฏิเสธด้วย "${EXAM_MSG.FORBIDDEN}"`,
    async run(ctx, jar) {
      jar.clear();
      const owner = await loginAs(ctx, jar, "resident01", "Resident1234");
      if (!loginSucceeded(owner, jar)) return { pass: false, detail: "owner login failed" };
      const mp = multipartUpload(
        { action: "upload" },
        {
          field: "photo",
          filename: "leak.png",
          contentType: "image/png",
          data: TINY_PNG,
        }
      );
      const up = await req(ctx, jar, "/repair_view.php?id=1", {
        method: "POST",
        body: mp.body,
        contentType: mp.contentType,
      });
      const upPage = await followOnce(ctx, jar, up);
      const upBody = up.body + "\n" + upPage.body;
      if (hasMarker(upBody, EXAM_MSG.UPLOAD_REJECTED)) {
        return { pass: false, detail: "valid PNG upload rejected — fix jpg/png allowlist first" };
      }
      const view = await req(ctx, jar, "/repair_view.php?id=1");
      const ids = [...view.body.matchAll(/download\.php\?id=(\d+)/gi)].map((m) => m[1]);
      const fileId = ids[0];
      if (!fileId) {
        return { pass: false, detail: "no download link after upload (upload may have failed)" };
      }
      jar.clear();
      const other = await loginAs(ctx, jar, "resident02", "Resident1234");
      if (!loginSucceeded(other, jar)) return { pass: false, detail: "resident02 login failed" };
      const dl = await req(ctx, jar, `/download.php?id=${fileId}`);
      const page = await followOnce(ctx, jar, dl);
      const body = dl.body + "\n" + page.body;
      const forbid = hasMarker(body, EXAM_MSG.FORBIDDEN);
      const ct = String(dl.headers["content-type"] || "");
      const servedFile =
        !forbid &&
        dl.status === 200 &&
        (/image\//i.test(ct) || /attachment/i.test(String(dl.headers["content-disposition"] || "")));
      return {
        pass: forbid && !servedFile,
        detail: `forbid=${forbid} servedFile=${servedFile} status=${dl.status} fileId=${fileId}`,
      };
    },
  },
  {
    id: "RT-L12-security-log",
    lab: "Lab12",
    title: "login แล้วมีแถวใน security_logs",
    how: `implement security_log() ให้ INSERT ลง security_logs — ใน login_process เรียก LOGIN_SUCCESS / LOGIN_FAILED (ห้ามใส่รหัสผ่านใน details)`,
    expected:
      "Example: login ผิดแล้วถูก → admin เปิด /admin_logs.php เห็น LOGIN_FAILED และ LOGIN_SUCCESS ในตาราง และไม่มีรหัสผ่านในหน้า",
    hint: "INSERT security_logs + เรียกตอน login สำเร็จ/ล้มเหลว — ห้ามเก็บ password",
    async run(ctx, jar) {
      jar.clear();
      const probePass = "SecretProbePass999";
      await loginAs(ctx, jar, "resident01", probePass);
      jar.clear();
      const ok = await loginAs(ctx, jar, "resident01", "Resident1234");
      if (!loginSucceeded(ok, jar)) return { pass: false, detail: "good login failed" };
      jar.clear();
      const admin = await loginAs(ctx, jar, "admin01", "Admin1234");
      if (!loginSucceeded(admin, jar)) return { pass: false, detail: "admin login failed" };
      const res = await req(ctx, jar, "/admin_logs.php");
      if (!isAppOk(res.body) || res.status !== 200) {
        return { pass: false, detail: `admin_logs unavailable status=${res.status}` };
      }
      if (hasMarker(res.body, EXAM_MSG.FORBIDDEN)) {
        return { pass: false, detail: "admin blocked from admin_logs" };
      }
      // Exact event_type strings (case-sensitive) as required by checklist
      const hasFail = res.body.includes("LOGIN_FAILED");
      const hasOk = res.body.includes("LOGIN_SUCCESS");
      const leaked = res.body.includes(probePass) || /Resident1234|Admin1234/.test(res.body);
      return {
        pass: hasFail && hasOk && !leaked,
        detail: `failed=${hasFail} success=${hasOk} leakedPw=${leaked}`,
      };
    },
  },

];

# Checklist — Smart Condo Portal Lab Exam

ใช้คู่กับ **Fix guide** และ **Example response** (`RUNTIME_MESSAGES.md`)  
Grader รัน HTTP จริง — ชื่อฟังก์ชันจะเปลี่ยนยังไงก็ได้ ขอให้พฤติกรรม / ข้อความตรง

บัญชีทดสอบใน DB: `resident01` / `Resident1234` · `admin01` / `Admin1234`

---

## ZIP — ไฟล์ที่ต้องมี (ไม่นับคะแนน)

ต้องมีไฟล์ครบใน ZIP (ดูรายชื่อใน Grader) แต่ **การมีไฟล์อย่างเดียวไม่ได้คะแนน**  
ส่ง starter ดิบ = **0 คะแนน** จนกว่าจะทำ Lab

- Lab08: ใส่ **GRANT** ใน `user.sql`
- Lab02: ใส่ `method="post"` ใน form login
- `compose.yaml` / `db.sql` ส่งหรือไม่ก็ได้

---

## Lab01 — Secure errors

**ทำอะไร**
- ห้ามโชว์ `$mysqli->error` / SQL syntax ให้ผู้ใช้
- ใช้ข้อความกลาง **`EXAM_MSG:GENERIC_ERROR`** + `error_log(...)`

**ไฟล์:** `register.php` (และจุดอื่นที่ query พังได้)

**Example / ผลที่ grader ดู (RT-L01)**
- POST `/register.php?database_error_test=1` → มี `EXAM_MSG:GENERIC_ERROR` และ**ไม่มี** `Database error:` / `mysqli`

---

## Lab02 — Form method

**ทำอะไร**
- Starter ตัด `method` ออกจาก `<form>` แล้ว — browser จะส่งเป็น GET
- ใส่ `method="post"` ให้ form ที่เปลี่ยนข้อมูล (login, register, logout, แจ้งซ่อม, คอมเมนต์, อัปโหลด)
- form ค้นหาของ admin ใส่ `method="get"`
- กด Login ไม่เข้า / เห็น `Method Not Allowed` → ยังไม่ได้ใส่ `method="post"` ที่ form login

**ไฟล์:** `login.php`, `register.php`, `logout.php`, `repairs.php`, อื่นๆ ที่มี form

**Example / ผลที่ grader ดู (RT-L02)**
- POST login `resident01` / `Resident1234` → ได้ session + redirect ไป `/repairs.php`

---

## Lab03 — Password hashing

**ทำอะไร**
- ใน `register.php` ใช้ `password_hash($password, PASSWORD_BCRYPT)` ก่อน INSERT
- ห้ามเก็บรหัสดิบในคอลัมน์ `password_hash`
- ใน `login_process.php` ใช้ `password_verify` ตรวจรหัส

**Example / ผลที่ grader ดู (RT-L03)**
- สมัคร user ใหม่ → ใน DB ค่า `password_hash` ขึ้นต้น `$2y$` / `$2a$` และ login ด้วยรหัสเดิมได้

---

## Lab04 — Login SQLi

**ทำอะไร**
- ใน `login_process.php` ห้ามต่อ string ใน `WHERE username = '...'`
- ใช้ `$mysqli->prepare` + `bind_param` แล้วค่อย `password_verify`

**Example / ผลที่ grader ดู (RT-L04)**
- POST username=`' OR '1'='1` (password อะไรก็ได้) → **ห้าม**เข้า `/repairs.php`

---

## Lab05 — Login lockout

**ทำอะไร**
- นับแถว `login_attempts` ที่ `success=0` ของ username นั้น
- ครบ **5** ครั้งแล้วบล็อก — แสดง **`EXAM_MSG:LOGIN_LOCKED`** (หรือ 403 body มีข้อความนี้)
- INSERT `login_attempts` ทุกครั้งที่ลอง login

**Example / ผลที่ grader ดู (RT-L05)** — รันทีหลังสุดของ runtime
- ผิดรหัส 5 ครั้ง → รหัสถูกก็เข้าไม่ได้

---

## Lab06 — Password policy

**ทำอะไร**
- ฝั่ง PHP บังคับรหัส ≥8 มีพิมพ์ใหญ่ + เล็ก + ตัวเลข — ไม่พึ่ง HTML `minlength` / `pattern` อย่างเดียว

**Example / ผลที่ grader ดู (RT-L06)**
- `password=short` หรือ `alllowercase1` → สมัครไม่ได้; `GoodPass1` + room ถูก → สมัครได้

---

## Lab07 — Session / Login

**ทำอะไร**
1. `includes/config.php`: `session_set_cookie_params` (**HttpOnly** + SameSite) **ก่อน** `session_start`
2. `login_process.php`: หลังรหัสถูก → `session_regenerate_id(true)` แล้วค่อยตั้ง `$_SESSION`
3. `auth_check.php`: idle timeout + absolute timeout + ตรวจ User-Agent แล้วบังคับ logout
4. `logout.php`: รับเฉพาะ POST (+ CSRF), ล้าง session, หมดอายุ cookie, `session_destroy`, กัน cache

**Example / ผลที่ grader ดู**
- `Set-Cookie: PHPSESSID=...; HttpOnly` (RT-L07-cookie-flags)
- PHPSESSID ก่อน login ≠ หลัง login (RT-L07-regen)

---

## Lab08 — SQLi / Least Privilege / .env

**ทำอะไร**
1. ใช้ `.env` จาก starter — อย่าเปลี่ยน `DB_PASS` ถ้ายังไม่แก้ `user.sql` ให้ตรง
2. ใน `user.sql` เพิ่มสิทธิ์แบบ Least Privilege บน `DB_NAME` ของคุณ เช่น  
   `GRANT SELECT, INSERT, UPDATE, DELETE ON \`db_คุณ\`.* TO 'คุณ'@'%';`  
   แล้ว `FLUSH PRIVILEGES;`
3. `includes/config.php` อ่าน `.env` ใช้ user ชื่อเดียวกับบัญชี Grader (ไม่ default เป็น root)
4. `repairs.php` (ค้นหา admin): ใช้ `prepare` + `bind_param` ห้ามต่อ `$q` เข้า SQL

**Example / ผลที่ grader ดู**
- รัน `user.sql` สำเร็จ + สิทธิ์ผ่านตรวจ Least Privilege
- GET `/repairs.php?q=' OR '1'='1` (หลัง login admin) → **ไม่**ดึงใบแจ้งซ่อมครบ + ไม่โชว์ SQL error (RT-L08-sqli)

---

## Lab09 — Validation + Regex

**ทำอะไร**
1. `register.php`: `preg_match` รหัสห้อง เช่น `/^[A-Z]-\d{3}$/` (ตัวอย่างถูก: `A-101`)
2. เมื่อผิด → แสดงข้อความเป๊ะ **`EXAM_MSG:ROOM_INVALID`** บนหน้า (ห้ามสมัครสำเร็จ)
3. `preg_match` เบอร์โทร + ตรวจ password ≥8 มีพิมพ์ใหญ่/เล็ก/ตัวเลข ฝั่ง PHP
4. `repair_create.php`: allowlist category + prepared INSERT
5. ห้ามโชว์ `$mysqli->error` ให้ผู้ใช้ — ใช้ `error_log`

**Example response (RT-L09)** — ดูรายละเอียดใน `RUNTIME_MESSAGES.md`

```text
EXAM_MSG:ROOM_INVALID
```

เทสส่ง `room_code=a101` แล้วต้องเจอข้อความนี้ในหน้า

---

## Lab10 — Ownership + XSS

**ทำอะไร**
- `repair_edit.php` / `repair_actions.php`: แก้/ยกเลิกได้เฉพาะเจ้าของใบ (`resident_id`) หรือ admin
- `announcements.php`: แสดงคอมเมนต์ด้วย `h()` / `htmlspecialchars` — ห้าม `echo $c['comment']` ดิบ

**Example / ผลที่ grader ดู (RT-L10)**
- หลังโพสต์ `<script>alert('xss')</script>` หน้าต้องมี `&lt;script` และ**ไม่มี**แท็ก `<script>...` ดิบ

---

## Lab11 — CSRF + Admin authz

**ทำอะไร**
1. `includes/config.php`: CSRF จริงด้วย `random_bytes` + เก็บใน session + `hash_equals` — ห้าม `verify_csrf` คืน `true` ตลอด
2. ใส่ `csrf_field()` / hidden `csrf_token` ในทุก form POST สำคัญ
3. เมื่อไม่มี/ผิด token → ตอบข้อความเป๊ะ **`EXAM_MSG:CSRF_REJECTED`**
4. `admin_logs.php`: เฉพาะ admin — ไม่งั้นตอบ **`EXAM_MSG:FORBIDDEN`**

**Example response**

```text
EXAM_MSG:CSRF_REJECTED
```

```text
EXAM_MSG:FORBIDDEN
```

รายละเอียด request/response เต็มใน `RUNTIME_MESSAGES.md` (RT-L11-csrf, RT-L11-admin-logs)

---

## Lab12 — Upload / Download / Security log

**ทำอะไร**
1. `repair_view.php`: อัปโหลด ≤2MB, jpg/png, ตรวจ MIME จริง (`finfo`), ชื่อไฟล์ใหม่, เก็บนอก web root (`/var/www/uploads_secure`) — ชนิดผิดตอบ **`EXAM_MSG:UPLOAD_REJECTED`**
2. `download.php`: เฉพาะเจ้าของใบหรือ admin — ไม่งั้น **`EXAM_MSG:FORBIDDEN`** (+ ควร log)
3. `security_log()`: INSERT ลง `security_logs` ตอน LOGIN_SUCCESS / LOGIN_FAILED — **ห้ามเก็บรหัสผ่าน**

**ผลที่ต้องได้ (runtime)**
- `RT-L12-upload-reject` · `RT-L12-download-authz` · `RT-L12-security-log` — ดู `RUNTIME_MESSAGES.md`

---

## ลำดับแนะนำ

1. `docker compose up --build -d` จาก starter → เปิด `http://127.0.0.1:8080`
2. ใส่ `GRANT` ใน `user.sql` ให้แอปต่อ DB ได้
3. ทำ Lab01 → 02 → 03 → 04 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → **05 (lockout สุดท้าย)**
4. ลองเคสใน `RUNTIME_MESSAGES.md` ให้เห็นข้อความเป๊ะ
5. ZIP ส่งที่ Grader

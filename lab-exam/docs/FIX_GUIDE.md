# Fix Guide — Smart Condo & Apartment Portal

สตาร์ทเตอร์ตั้งใจไม่ปลอดภัย แก้ไฟล์ใน `www/` ให้ผ่าน checklist แล้ว ZIP ส่งที่ Grader

อ่านคู่กัน:
- **CHECKLIST.md** — แต่ละ lab ต้องทำอะไร
- **RUNTIME_MESSAGES.md** — Example response / ข้อความเป๊ะที่ grader จับ (`EXAM_MSG:...`)

## Demo accounts

| Username | Password | Role | Room |
|----------|----------|------|------|
| resident01 | Resident1234 | resident | A-101 |
| resident02 | Resident1234 | resident | B-202 |
| admin01 | Admin1234 | admin | OFFICE |

**บัญชีหลายคน:** Register/Login ที่ Grader — ได้ **ฐานข้อมูลส่วนตัว** เช่น `db_std64001` (ไม่แชร์กับคนอื่น)

ดาวน์โหลด starter จะได้:
- `.env` — `DB_NAME` / `DB_USER` / `DB_PASS` (รหัส MySQL **สร้างให้แล้ว ไม่ใช่รหัส login Grader**)
- `user.sql` — `CREATE USER` พร้อมรหัสนั้นแล้ว · **คุณเพิ่มสิทธิ์ Least Privilege เอง**บน `DB_NAME`

รันแอปด้วย Docker Compose ของคุณเอง · ส่ง ZIP ที่ Grader อย่างเดียว  
`config.php` อ่าน `.env` แล้ว

---

## Lab01 — Secure errors

**ไฟล์:** `register.php` (และจุดที่ query พัง)

- อย่า `echo $mysqli->error` ให้ผู้ใช้
- ใช้ `EXAM_MSG:GENERIC_ERROR` + `error_log(...)`

**ผลที่ต้องได้:** `?database_error_test=1` แล้วเห็นข้อความกลาง ไม่มีคำว่า mysqli / Database error:

---

## Lab02 — Form method (ตัดมาให้ทำเอง)

Starter **ไม่มี** `method` ใน `<form>` (browser จะส่งเป็น GET)

- form login / register / logout / แจ้งซ่อม / คอมเมนต์ / อัปโหลด → `method="post"`
- form ค้นหา (admin) → `method="get"`
- กด Login แล้วยังเข้าไม่ได้ / เห็น `Method Not Allowed` → ยังไม่ได้ใส่ `method="post"`

---

## Lab03 — Password hashing

**ไฟล์:** `register.php`, `login_process.php`

- Register: `password_hash($password, PASSWORD_BCRYPT)` แล้ว INSERT เฉพาะ hash
- Login: `password_verify($password, $row['password_hash'])`

**ผลที่ต้องได้:** ใน DB เป็น bcrypt (`$2y$…`) และ login ด้วยรหัสเดิมได้

---

## Lab04 — Login SQLi

**ไฟล์:** `login_process.php`

- ห้ามต่อ `$username` เข้า SQL string
- ใช้ `prepare` + `bind_param` + `password_verify`

**ผลที่ต้องได้:** username `' OR '1'='1` เข้าสู่ระบบไม่ได้

---

## Lab05 — Login lockout

**ไฟล์:** `login_process.php` + ตาราง `login_attempts`

- ผิดครบ **5** ครั้งในหน้าต่างเวลาสั้นๆ → บล็อกด้วย `EXAM_MSG:LOGIN_LOCKED`
- บันทึกทุก attempt (success 0/1)

**ผลที่ต้องได้:** ผิด 5 ครั้งแล้วรหัสถูกก็เข้าไม่ได้

---

## Lab06 — Password policy

**ไฟล์:** `register.php`

- ฝั่ง PHP: ≥8 ตัว มี `[a-z]` `[A-Z]` `\d` — ไม่พึ่ง HTML อย่างเดียว

**ผลที่ต้องได้:** รหัสอ่อนสมัครไม่ได้ · รหัสแข็งแรงสมัครได้

---

## Lab07 — Session / Login protection

**ไฟล์:** `includes/config.php`, `includes/auth_check.php`, `login_process.php`, `logout.php`

1. `session_set_cookie_params` ก่อน `session_start` (HttpOnly + SameSite)
2. หลัง login สำเร็จ: `session_regenerate_id(true)` + เก็บ `login_time`, `last_activity`, `user_agent`
3. `auth_check`: idle / absolute timeout + UA เปลี่ยนแล้วบังคับ logout
4. Logout: POST + CSRF, ล้าง session, `setcookie` หมดอายุ, `session_destroy`, กัน cache

**ผลที่ต้องได้:** Session ID เปลี่ยนหลัง login · timeout แล้วเข้าระบบไม่ได้

---

## Lab08 — SQLi / Least Privilege

**ไฟล์:** `repairs.php` (ค้นหาของ admin), `includes/config.php`

- เปลี่ยนค้นหาจากต่อ string เป็น `prepare` + `bind_param`
- ห้ามโชว์ Generated SQL / `$mysqli->error` ให้ผู้ใช้
- แอปใช้ MySQL user **ชื่อเดียวกับ username Grader** ไม่ใช่ `root`
- สิทธิ์มากจาก `user.sql` ที่คุณเขียนเอง

**ผลที่ต้องได้:** ค้นหาปกติได้ · payload คล้าย SQLi ไม่ดึงทุกใบ · ตรวจสิทธิ์ผ่าน

---

## Lab09 — Validation + Regex

**ไฟล์:** `register.php`, `repair_create.php`

1. **รหัสห้อง** ใช้ `preg_match` เช่น `/^[A-Z]-\d{3}$/` (ตัวอย่าง `A-101`)
2. เมื่อ room ผิดรูปแบบ แสดงข้อความเป๊ะ: `EXAM_MSG:ROOM_INVALID`
3. **เบอร์โทร** ใช้ `preg_match` เช่น `/^0\d{8,9}$/`
4. **Password policy** ฝั่งเซิร์ฟเวอร์: ≥8 ตัว มีพิมพ์ใหญ่ เล็ก และตัวเลข
5. ใบแจ้งซ่อม: allowlist category + length + prepared INSERT
6. Error ปลอดภัย: ข้อความกลาง + `error_log`

**ผลที่ต้องได้:** room ผิด → มี `EXAM_MSG:ROOM_INVALID` · phone/password ผิดสมัครไม่ได้ · category แปลกไม่บันทึก

---

## Lab10 — Ownership + XSS

**ไฟล์:** `repair_edit.php`, `repair_actions.php`, `announcements.php`

- แก้/ยกเลิกใบแจ้งซ่อมได้เฉพาะ `resident_id` ของตัวเอง หรือ admin
- แสดงคอมเมนต์ด้วย `h()` / `htmlspecialchars` — ห้าม `echo $c['comment']` ดิบ

**ผลที่ต้องได้:** ลูกบ้านแก้ใบคนอื่นไม่ได้ · `<script>` ในคอมเมนต์ไม่รัน

---

## Lab11 — CSRF + Admin authz

**ไฟล์:** `includes/config.php` (csrf helpers), forms ใน announcements/repairs/logout/upload, `admin_logs.php`

1. CSRF: `random_bytes` + `hash_equals` — ห้าม `verify_csrf` คืน `true` ตลอด
2. ใส่ token ในทุก form POST สำคัญ
3. เมื่อ CSRF ล้มเหลว ต้องมีข้อความเป๊ะใน response: `EXAM_MSG:CSRF_REJECTED`
4. `/admin_logs.php` เฉพาะ admin — ปฏิเสธด้วยข้อความเป๊ะ: `EXAM_MSG:FORBIDDEN`

**ผลที่ต้องได้:** POST ปลอมไม่มี token → มี `EXAM_MSG:CSRF_REJECTED` · resident เปิด logs → มี `EXAM_MSG:FORBIDDEN`

ดูตารางเต็มใน `docs/RUNTIME_MESSAGES.md`

---

## Lab12 — Upload + Download + Security Log

**ไฟล์:** `repair_view.php` (upload), `download.php`, `includes/config.php`, `login_process.php`

1. รูปประกอบแจ้งซ่อม: ≤2MB, jpg/png, MIME จริง (`finfo`), ชื่อใหม่, เก็บ `/var/www/uploads_secure` — ชนิดผิด → `EXAM_MSG:UPLOAD_REJECTED`
2. `download.php`: เฉพาะเจ้าของใบหรือ admin → ไม่งั้น `EXAM_MSG:FORBIDDEN` + ควร `security_log` ตอนดาวน์โหลด
3. `security_log()` เขียน `security_logs` สำหรับ `LOGIN_SUCCESS` / `LOGIN_FAILED` (ห้ามเก็บรหัสผ่าน)

**ผลที่ต้องได้:** อัปโหลด `.php` ไม่ได้ · resident02 โหลดไฟล์ใบของ resident01 ไม่ได้ · admin เห็น LOGIN_* ใน `/admin_logs.php`

---

## รันบนเครื่องตัวเอง (ก่อนส่ง)

Starter ZIP มี `compose.yaml` + `db.sql` + `Dockerfile` แล้ว:

```bash
docker compose up --build -d
# เปิด http://127.0.0.1:8080
```

`db.sql` สร้างตาราง + seed อัตโนมัติ (เหมือน grader) ตอน volume DB ว่างครั้งแรก — ดู `README-LOCAL.md`

---

## ส่งตรวจ

1. Register/Login ที่ Grader (`http://<IP-เครื่องTA>:3000` หรือ `http://127.0.0.1:3000`)
2. แก้ `user.sql` (CREATE USER มีให้ — เพิ่มสิทธิ์ Least Privilege เอง)
3. ZIP ไฟล์ที่แก้ รวม `user.sql` — ระบบจับจาก**ชื่อไฟล์** (`compose.yaml` / `db.sql` ส่งหรือไม่ก็ได้)
4. อัปโหลด `.zip` → materialize → รัน `user.sql` → **HTTP runtime tests** (ดู `RUNTIME_MESSAGES.md`)
5. ข้อ FAIL มี hint + expected output
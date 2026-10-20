# Example response ที่ Grader จับ (ต้องตรงเป๊ะ)

หลังอัป ZIP Grader จะ **รันแอปของคุณจริง** แล้วยิง HTTP เหมือนผู้ใช้  
บางข้อจับ **ข้อความตายตัว** ใน body — คัดลอกสตริงให้ตรงทุกตัวอักษร (เว้นวรรค/ตัวพิมพ์ต่าง = FAIL)

---

## สรุปข้อความตายตัว

| ID | สถานการณ์ที่เทส | สิ่งที่ต้องเห็นใน response / หน้า |
|----|-----------------|-------------------------------------|
| RT-L01-secure-error | POST `/register.php?database_error_test=1` | มี `EXAM_MSG:GENERIC_ERROR` และ**ไม่มี** `Database error:` / mysqli |
| RT-L05-lockout | login ผิด 5 ครั้ง แล้วลองรหัสถูก | มี `EXAM_MSG:LOGIN_LOCKED` (หรือเข้า `/repairs.php` ไม่ได้) |
| RT-L09-room-regex | POST register ด้วย `room_code=a101` | มีข้อความ `EXAM_MSG:ROOM_INVALID` และ**ห้าม**สมัครสำเร็จ |
| RT-L11-csrf | POST คอมเมนต์**ไม่มี** `csrf_token` | มีข้อความ `EXAM_MSG:CSRF_REJECTED` และคอมเมนต์**ไม่ถูกบันทึก** |
| RT-L11-admin-logs | login เป็น `resident01` แล้ว GET `/admin_logs.php` | มีข้อความ `EXAM_MSG:FORBIDDEN` และ**ไม่**โชว์ตาราง Security Audit Log |
| RT-L12-upload-reject | POST อัปโหลด `shell.php` ไป `/repair_view.php?id=1` | มี `EXAM_MSG:UPLOAD_REJECTED` และ**ไม่**อัปขึ้น `uploads_insecure` |
| RT-L12-download-authz | resident01 อัป PNG แล้ว resident02 เปิด `/download.php?id=…` | มี `EXAM_MSG:FORBIDDEN` |
| RT-L12-security-log | login ผิดแล้วถูก แล้ว admin เปิด `/admin_logs.php` | มี `LOGIN_FAILED` และ `LOGIN_SUCCESS` (ไม่มีรหัสผ่านในหน้า) |

---

## Lab09 — room ผิดรูปแบบ

**เทสทำอะไร:** POST `/register.php` ด้วย  
`room_code=a101` (ตัวพิมพ์เล็ก + ไม่มีขีด — ผิดรูปแบบ `A-101`)

**คุณต้องทำ:** ใน `register.php` ใช้ `preg_match` ฝั่งเซิร์ฟเวอร์ เช่น `/^[A-Z]-\d{3}$/`  
ถ้าไม่ผ่าน → แสดงข้อความนี้บนหน้า (ใน `$errors` ก็ได้):

```text
EXAM_MSG:ROOM_INVALID
```

**Example response (body ต้องมีบรรทัดนี้):**

```html
<div class="msg err">EXAM_MSG:ROOM_INVALID</div>
```

**Example code:**

```php
if (!preg_match('/^[A-Z]-\d{3}$/', $room)) {
    $errors[] = 'EXAM_MSG:ROOM_INVALID';
}
// แล้ว echo h($e) ในหน้า — ห้าม redirect ไป login?msg=registered
```

---

## Lab11 — CSRF ถูกปฏิเสธ

**เทสทำอะไร:** login เป็น `resident01` แล้ว POST `/announcement_actions.php`  
โดย**ไม่ส่ง** `csrf_token` (ส่งแค่ `action=comment`, `announcement_id`, `comment`)

**คุณต้องทำ:**
1. ใน `includes/config.php` ทำให้ `verify_csrf` ตรวจจริง (`hash_equals`) — ห้าม `return true` ตลอด
2. ใน `announcement_actions.php` ถ้า verify ไม่ผ่าน → ตอบด้วยข้อความเป๊ะ

**Example response:**

```http
HTTP/1.1 403 Forbidden

EXAM_MSG:CSRF_REJECTED
```

หรือ redirect แล้วหน้าปลายทางมีข้อความเดียวกันก็ได้

**Example code:**

```php
if (!verify_csrf($_POST['csrf_token'] ?? null)) {
    http_response_code(403);
    exit('EXAM_MSG:CSRF_REJECTED');
}
```

**ผลที่ต้องได้เพิ่ม:** คอมเมนต์ปลอม**ไม่โผล่**ใน `/announcements.php`

---

## Lab11 — resident เปิด admin logs ไม่ได้

**เทสทำอะไร:** login `resident01` / `Resident1234` → GET `/admin_logs.php`

**คุณต้องทำ:** ใน `admin_logs.php` ถ้า `role !== 'admin'` ปฏิเสธทันที

**Example response:**

```http
HTTP/1.1 403 Forbidden

EXAM_MSG:FORBIDDEN
```

**Example code:**

```php
$user = require_login();
if (($user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    exit('EXAM_MSG:FORBIDDEN');
}
```

**ผลที่ต้องได้เพิ่ม:** หน้าต้อง**ไม่มี**หัวข้อ Security Audit Log + ตาราง log

---

## Lab12 — อัปโหลดชนิดผิด

**เทสทำอะไร:** login `resident01` → POST multipart ไป `/repair_view.php?id=1`  
ไฟล์ชื่อ `shell.php` เนื้อหา PHP (ไม่ใช่รูป)

**คุณต้องทำ:** ตรวจนามสกุล + MIME จริง แล้วปฏิเสธด้วยข้อความเป๊ะ:

```text
EXAM_MSG:UPLOAD_REJECTED
```

**Example code:**

```php
if (!in_array($ext, ALLOWED_UPLOAD_EXT, true) || !in_array($mime, ALLOWED_UPLOAD_MIME, true)) {
    $uploadErr = 'EXAM_MSG:UPLOAD_REJECTED';
}
// เก็บที่ /var/www/uploads_secure/ + ชื่อสุ่ม — ห้าม uploads_insecure
```

---

## Lab12 — download ห้ามคนอื่น

**เทสทำอะไร:** resident01 อัป PNG ใบ `#1` → resident02 GET `/download.php?id=…`

**คุณต้องทำ:** ใน `download.php` ถ้าไม่ใช่เจ้าของใบและไม่ใช่ admin:

```php
http_response_code(403);
exit('EXAM_MSG:FORBIDDEN');
```

---

## Lab12 — security_log ตอน login

**เทสทำอะไร:** login รหัสผิด แล้วรหัสถูก → login `admin01` เปิด `/admin_logs.php`

**คุณต้องทำ:** `security_log()` INSERT จริง + ใน `login_process.php` เรียก  
`LOGIN_FAILED` / `LOGIN_SUCCESS` — **ห้ามใส่รหัสผ่านใน details**

**Example:** ตาราง log มีทั้งสอง event_type

---

## เคสที่จับพฤติกรรม (ไม่มี EXAM_MSG)

| ID | สรุปผลที่ต้องได้ |
|----|------------------|
| RT-L02-login-post | form login มี `method="post"` + login ได้ (302 → `/repairs.php`) |
| RT-L03-password-hash | สมัครแล้ว `password_hash` ใน DB เป็น bcrypt + login ได้ |
| RT-L04-login-sqli | username `' OR '1'='1` เข้าสู่ระบบไม่ได้ |
| RT-L06-password-policy | รหัสอ่อนสมัครไม่ได้ · รหัสแข็งแรงสมัครได้ |
| RT-L07-cookie-flags | `Set-Cookie` ของ PHPSESSID มี `HttpOnly` |
| RT-L07-regen | PHPSESSID ก่อน login ≠ หลัง login |
| RT-L08-sqli | payload SQLi ไม่ดึงใบครบ + ไม่โชว์ SQL error |
| RT-L10-xss | คอมเมนต์มี `&lt;script` และไม่มีแท็ก `<script>` ดิบ |

### RT-L01-secure-error — Generic error

- **ทำ:** แทน `$mysqli->error` ด้วย `EXAM_MSG:GENERIC_ERROR` + `error_log`
- **เทส:** POST `/register.php?database_error_test=1`
- **Example:** body มี `EXAM_MSG:GENERIC_ERROR`

### RT-L03-password-hash — bcrypt

- **ทำ:** `password_hash(..., PASSWORD_BCRYPT)` ตอนสมัคร + `password_verify` ตอน login
- **เทส:** สมัคร user ใหม่ แล้วอ่าน `password_hash` ใน DB
- **Example:** ค่าขึ้นต้น `$2y$` และ login ด้วยรหัสเดิมได้

### RT-L04-login-sqli — Login injection

- **ทำ:** `prepare` + `bind_param` + `password_verify` ใน `login_process.php`
- **เทส:** POST username=`' OR '1'='1` password=`x`
- **Example:** **ไม่** 302 ไป `/repairs.php`

### RT-L05-lockout — 5 failures

- **ทำ:** นับ `login_attempts` success=0 ครบ 5 → `EXAM_MSG:LOGIN_LOCKED`
- **เทส:** ผิดรหัส 5 ครั้ง แล้วลองรหัสถูก
- **Example:** เข้าไม่ได้ / มี `EXAM_MSG:LOGIN_LOCKED`

### RT-L06-password-policy — Server-side policy

- **ทำ:** `preg_match` ฝั่ง PHP (≥8 + ใหญ่ + เล็ก + ตัวเลข)
- **เทส:** `short` / `alllowercase1` สมัครไม่ได้ · `GoodPass1` สมัครได้

### RT-L02-login-post — Login POST

- **ทำ:** form login ใส่ `method="post"` → ไป `/login_process.php`
- **เทส:** POST username=`resident01` password=`Resident1234`
- **Example:** `302` Location ไป `/repairs.php` + มี cookie `PHPSESSID`

### RT-L07-cookie-flags — Cookie HttpOnly

- **ทำ:** ใน `includes/config.php` เรียก `session_set_cookie_params([... 'httponly' => true ...])` **ก่อน** `session_start()`
- **เทส:** GET `/login.php` ดู header `Set-Cookie`
- **Example:** `Set-Cookie: PHPSESSID=...; path=/; HttpOnly` (ควรมี SameSite ด้วย)

### RT-L07-regen — Session regenerate

- **ทำ:** หลังรหัสถูก ใน `login_process.php` เรียก `session_regenerate_id(true)`
- **เทส:** จำ `PHPSESSID` ก่อน login แล้วเทียบหลัง login
- **Example:** ค่า cookie ก่อน ≠ หลัง

### RT-L08-sqli — SQLi

- **ทำ:** ใน `repairs.php` ค้นหาด้วย `prepare` + `bind_param` ห้ามต่อ string `$q` เข้า SQL
- **เทส:** login `admin01` แล้ว GET `/repairs.php?q=' OR '1'='1`
- **Example:** หน้า**ไม่**โชว์ใบแจ้งซ่อมครบทุกใบ (เช่นไม่โชว์ทั้ง “น้ำหยดใต้ซิงค์” และ “ไฟห้องน้ำดับ” พร้อมกันจาก payload) และไม่มี SQL error โชว์ผู้ใช้

### RT-L10-xss — XSS encode

- **ทำ:** ใน `announcements.php` แสดงคอมเมนต์ด้วย `<?= h($c['comment']) ?>` ห้าม echo ดิบ
- **เทส:** โพสต์คอมเมนต์ `<script>alert('xss')</script>` แล้วเปิดหน้ารายการใหม่
- **Example body:** มี `&lt;script` และ**ไม่มี**แท็ก `<script>alert('xss')</script>` ดิบ

---

## ตรวจเองก่อนส่ง

1. `docker compose up --build -d` จาก starter ZIP
2. ลองเคสด้านบนด้วยเบราว์เซอร์ / curl ให้เห็นข้อความเป๊ะ
3. ค่อย ZIP ส่ง Grader

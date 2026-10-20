# LabExamWebSec

ระบบฝึกสอบแลปความมั่นคงเว็บ (CP423324) ธีม **Smart Condo & Apartment Portal** — แจ้งซ่อม + กระดานข่าว พร้อม **Grader อัตโนมัติ** (Next.js) ที่ตรวจโค้ดนักเรียนผ่าน HTTP จริงบน Docker

| ส่วน | รายละเอียด |
|------|------------|
| Portal (PHP starter) | แอปตั้งใจไม่ปลอดภัย — นักเรียนแก้ให้ผ่าน Lab 01–12 |
| Grader | สมัคร/ล็อกอิน → ดาวน์โหลด starter ส่วนตัว → อัปโหลด ZIP → ได้คะแนน |
| Runner | รัน ZIP นักเรียนในเครือข่าย `internal` (ไม่มี internet / ไม่เปิดพอร์ตออกนอก) |
| เอกสารแลป | PDF ใน `WebSecLabExam/` |

---

## ความต้องการของระบบ

- Docker + Docker Compose v2
- พอร์ตว่าง: `3000` (grader), `8080` (portal), `8081` (phpMyAdmin), `3307` (MariaDB), `4040` (ngrok inspector)
- **บัญชี [ngrok](https://ngrok.com) + authtoken** — **จำเป็น** เพราะ `docker-compose.yml` มี service `ngrok` ที่อ่าน `NGROK_AUTHTOKEN` จาก `lab-exam/.env` ถ้าไม่มีไฟล์นี้ / token ว่าง compose จะเตือนและ tunnel ขึ้นไม่ได้ (`ERR_NGROK_3200` / container restart)

---

## โครงสร้างโปรเจกต์

```
LabExamWebSec/
├── README.md                 # ไฟล์นี้
├── .gitignore
├── WebSecLabExam/            # เอกสารแลป (PDF) + demo
└── lab-exam/                 # สแต็ก Docker หลัก
    ├── docker-compose.yml
    ├── .env.example          # แม่แบบ — คัดลอกเป็น .env
    ├── .env                  # NGROK_AUTHTOKEN (สร้างเอง · ห้าม commit)
    ├── mysql/                # schema + seed
    ├── php/www/              # starter PHP (insecure)
    ├── php/runner/           # container รัน ZIP ตอน grade
    ├── grader/               # Next.js grader
    ├── student-pack/         # แพ็กที่นักเรียนดาวน์โหลดไปรันเอง
    └── docs/                 # CHECKLIST / FIX_GUIDE / …
```

---

## Setup (ผู้สอน / เครื่อง lab)

### 1. Clone / เข้าโฟลเดอร์

```bash
cd LabExamWebSec/lab-exam
```

### 2. สร้าง `.env` สำหรับ ngrok (ต้องทำก่อน `compose up`)

Compose อ่าน token จาก `lab-exam/.env` — **ไม่มีไฟล์นี้แล้วรัน stack ไม่ครบ** (service `ngrok` พัง)

```bash
cp .env.example .env
```

แก้ `.env` ใส่ token จริงจาก [ngrok dashboard → Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken):

```bash
NGROK_AUTHTOKEN=your_ngrok_authtoken_here
```

อย่า commit `.env` (อยู่ใน `.gitignore` แล้ว) — commit ได้แค่ `.env.example`

### 3. ขึ้นสแต็ก

```bash
docker compose up -d --build
```

รอให้ `labexam-db` healthy แล้วเปิด Grader

### 4. ตรวจสถานะ

```bash
docker compose ps
docker compose logs ngrok     # ต้องเห็น public HTTPS URL · ไม่ใช่ authentication failed
docker compose logs -f grader
```

หยุด / รีเซ็ต volume DB:

```bash
docker compose down          # หยุดอย่างเดียว
docker compose down -v       # ล้าง DB + grader data ด้วย
```

---

## URLs

Bind `0.0.0.0` — เปิดจากเครื่องอื่นใน LAN ด้วย IP ของโฮสต์ได้ (`hostname -I`)

| Service | localhost | หมายเหตุ |
|---------|-----------|----------|
| **Grader** | http://localhost:3000 | นักเรียนสมัคร / ส่ง ZIP / ดูคะแนน |
| Portal (starter บนโฮสต์) | http://localhost:8080 | ดูโค้ดตัวอย่างบนเครื่อง lab |
| phpMyAdmin | http://localhost:8081 | root / `RootPass1234` |
| MariaDB | localhost:3307 | root / `RootPass1234` · DB `db_labexam` |
| ngrok inspector | http://127.0.0.1:4040 | ดู public HTTPS URL |
| ngrok public | `docker compose logs ngrok` | ใช้ตอนต้องการเปิดนอกเครื่อง |

---

## บัญชี demo (ในแอป PHP)

| Username | Password | Role |
|----------|----------|------|
| resident01 | Resident1234 | resident |
| resident02 | Resident1234 | resident |
| admin01 | Admin1234 | admin |

นักเรียนแต่ละคนที่สมัครบน **Grader** จะได้ **ฐานข้อมูลส่วนตัว** (เช่น `db_std…`) ไม่แชร์กับคนอื่น — รหัส MySQL อยู่ใน `.env` ที่ดาวน์โหลดจาก Grader (ไม่ใช่รหัสล็อกอิน Grader)

---

## โฟลว์นักเรียน (สรุป)

1. เปิด Grader → Register / Login  
2. ดาวน์โหลด starter ZIP (มี `.env` + `user.sql` ตรงบัญชีตัวเอง)  
3. รันบนเครื่องตัวเอง (ดู `lab-exam/student-pack/README-LOCAL.md`)  
4. แก้โค้ดใน `www/` ตาม Lab → ZIP ส่งกลับที่ Grader  
5. ดูผล runtime / checklist

ไฟล์ที่มักต้องมีใน ZIP: โค้ดที่แก้ + `.env` + `user.sql` (Lab08 ใส่ GRANT ใน `user.sql`)

รายละเอียดข้อสอบ: `lab-exam/docs/CHECKLIST.md` · `FIX_GUIDE.md` · `RUNTIME_MESSAGES.md`

---

## Labs ที่ grader ตรวจ

| Lab | หัวข้อ |
|-----|--------|
| 01 | Secure errors (`EXAM_MSG:GENERIC_ERROR`) |
| 02 | Form `method="post"` |
| 03 | Password hashing (bcrypt) |
| 04 | Login SQLi |
| 05 | Brute-force lockout |
| 06 | Session security |
| 07 | Session / login protection |
| 08 | Least privilege + SQLi protection |
| 09 | Validation + regex |
| 10 | Ownership + XSS encoding |
| 11 | CSRF + admin authz |
| 12 | Secure upload / download / security log |

เพิ่ม lab ใหม่ใน grader: ดู `lab-exam/docs/ADD_LAB.md`

---

## พัฒนา grader แบบ local (ทางเลือก)

ปกติ build ผ่าน Docker ก็พอ ถ้าจะรัน Next.js นอก container:

```bash
cd lab-exam/grader
npm ci
npm run dev    # http://0.0.0.0:3000 — ต้องชี้ env ไปที่ db/runner ที่ compose ยังรันอยู่
```

ตัวแปรสำคัญฝั่ง grader (ใน compose ตั้งให้แล้ว): `DB_HOST`, `DB_ROOT_PASSWORD`, `RUNNER_HOST`, `STARTER_DIR`, `SESSION_SECRET`, `RESET_KEY`

---

## เอกสารเพิ่มเติม

| ไฟล์ | เนื้อหา |
|------|---------|
| `lab-exam/README.md` | Quick start สั้นๆ |
| `lab-exam/docs/CHECKLIST.md` | สิ่งที่ต้องทำทีละ lab |
| `lab-exam/docs/FIX_GUIDE.md` | แนวทางแก้ starter |
| `lab-exam/docs/RUNTIME_MESSAGES.md` | ข้อความที่ grader จับ |
| `lab-exam/docs/ADD_LAB.md` | วิธีเพิ่ม lab ใน registry |
| `lab-exam/student-pack/README-LOCAL.md` | นักเรียนรัน starter เอง |
| `WebSecLabExam/` | PDF เอกสารแลปต้นฉบับ |

---

## Troubleshooting เร็วๆ

| อาการ | ลองทำ |
|-------|--------|
| `NGROK_AUTHTOKEN` ว่าง / warn ตอน compose | `cp .env.example .env` แล้วใส่ token จริง · ห้ามลืมไฟล์นี้ |
| ngrok authentication failed / restart loop | token ผิดหรือหมดอายุ — แก้ `.env` แล้ว `docker compose up -d ngrok` |
| ngrok `ERR_NGROK_3200` (offline) | token หาย/container ดับ — เช็ค `.env` แล้ว `docker compose restart ngrok` |
| Grader ขึ้นไม่ได้ / build ค้าง | `docker compose build grader --no-cache && docker compose up -d` |
| DB เก่า / schema ไม่ตรง | `docker compose down -v && docker compose up -d --build` |
| นักเรียน Lab01 fail ทั้งที่แก้แล้ว | มักเป็น ZIP ซ้อนโฟลเดอร์ / `.env` ไม่ตรง `user.sql` / พลาด `export` หน้าตัวแปรใน `.env` |
| Portal Access denied หลัง Lab08 | `IDENTIFIED BY` ใน `user.sql` ต้องตรง `DB_PASS` ใน `.env` |

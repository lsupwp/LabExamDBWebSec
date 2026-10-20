# Smart Condo Portal — Lab Exam Stack

เว็บฝึกสอบแลป CP423324 ธีม **นิติบุคคลคอนโด/หมู่บ้าน** (แจ้งซ่อม + กระดานข่าว)  
ครอบคลุม Lab01–12 พร้อม Grader (Next.js)

รายละเอียดเต็ม + setup: **[../README.md](../README.md)**

## URLs

| Service | URL |
|---------|-----|
| Grader | http://localhost:3000 |
| Portal (PHP) | http://localhost:8080 |
| phpMyAdmin | http://localhost:8081 (root / `RootPass1234`) |

## Start

**ต้องมี `lab-exam/.env` ใส่ `NGROK_AUTHTOKEN` ก่อน** — ไม่มีแล้ว service `ngrok` ใน compose ขึ้นไม่ได้

```bash
cd lab-exam
cp .env.example .env
# แก้ .env ใส่ token จาก https://dashboard.ngrok.com/get-started/your-authtoken
docker compose up -d --build
```

## Demo accounts

| User | Password | Role |
|------|----------|------|
| resident01 | Resident1234 | resident |
| resident02 | Resident1234 | resident |
| admin01 | Admin1234 | admin |

สร้าง DB user แบบ least privilege เอง — ดู `docs/FIX_GUIDE.md`

## Docs

- `docs/CHECKLIST.md` — สิ่งที่ต้องทำทีละ lab  
- `docs/FIX_GUIDE.md` — แนวทางแก้  
- `docs/RUNTIME_MESSAGES.md` — ข้อความที่ grader จับ  
- `docs/ADD_LAB.md` — เพิ่ม lab ใน grader  
- `student-pack/README-LOCAL.md` — นักเรียนรันเอง  

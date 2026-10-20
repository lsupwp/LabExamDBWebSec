# Smart Condo & Apartment Portal — Practice Lab Exam

เว็บฝึกสอบแลป CP423324 ธีม **นิติบุคคลคอนโด/หมู่บ้าน**: แจ้งซ่อม + กระดานข่าว  
ครอบคลุม Lab07–Lab12 (และ validation/regex จาก Lab09) ในโปรเจกต์เดียว พร้อม Grader (Next.js)

## URLs

Bind `0.0.0.0` — เปิดจากเครื่องอื่นใน LAN ด้วย IP เครื่องนี้ได้

| Service | localhost | ตัวอย่าง LAN |
|---------|-----------|--------------|
| Portal (PHP) | http://localhost:8080 | http://\<IP\>:8080 |
| Grader | http://localhost:3000 | http://\<IP\>:3000 |
| phpMyAdmin | http://localhost:8081 | http://\<IP\>:8081 (root / `RootPass1234`) |

ดู IP: `hostname -I`

## Start

```bash
cd lab-exam
docker compose up -d --build
```

## Demo accounts

| User | Password | Role |
|------|----------|------|
| resident01 | Resident1234 | resident |
| resident02 | Resident1234 | resident |
| admin01 | Admin1234 | admin |

สร้าง DB application user เอง (ไม่รวมใน init) — ดู `docs/FIX_GUIDE.md`

## Modules

- สมาชิก / Login — register (room regex), brute-force, session security
- แจ้งซ่อม CRUD — prepared statements, validation, ownership
- กระดานข่าว + คอมเมนต์ — XSS encoding, CSRF
- แนบรูป + Security Log — MIME/size, นอก web root, download authz

## Layout

```
lab-exam/
  docker-compose.yml
  mysql/init.sql
  php/www/                 # insecure starter
  php/uploads_secure/
  grader/                  # Next.js checks
  docs/FIX_GUIDE.md
  docs/CHECKLIST.md
```

# รัน starter บนเครื่องตัวเอง

```bash
unzip websec-labexam-starter.zip -d labexam
cd labexam
docker compose up --build -d
```

เปิด http://127.0.0.1:8080

| บัญชี | รหัส |
|--------|------|
| resident01 | Resident1234 |
| admin01 | Admin1234 |

ขั้นแรกทำ Lab02: ใส่ `method="post"` ใน form login (และ form อื่น) ไม่งั้นกด Login จะได้ Method Not Allowed

- `db.sql` สร้างตาราง + seed อัตโนมัติตอน `db` ขึ้นครั้งแรก (volume ว่าง)
- `.env` ถูกสร้างให้ตรงบัญชี Grader ของคุณแล้ว — ใช้กับทั้ง local compose และตอนส่งตรวจ
- แก้โค้ดใน `www/` แล้วรีเฟรชเบราว์เซอร์ (volume mount)
- ส่งตรวจ: zip ไฟล์ที่แก้ + `.env` + `user.sql` (ไม่ต้องส่ง `compose.yaml` / `db.sql` ก็ได้)

รีเซ็ต DB ท้องถิ่น:

```bash
docker compose down -v
docker compose up --build -d
```

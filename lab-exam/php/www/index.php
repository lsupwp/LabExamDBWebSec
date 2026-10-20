<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/layout.php';

render_header('Home');
?>
<h1>Smart Condo &amp; Apartment Portal</h1>
<p class="hero-note">ระบบแจ้งซ่อมและกระดานข่าวสารส่วนกลางสำหรับลูกบ้านและนิติบุคคล — สตาร์ทเตอร์ตั้งใจไม่ปลอดภัย ให้แก้ตาม checklist แล้วส่งตรวจที่ Grader</p>

<div class="card">
  <h2>โมดูลในโปรเจกต์นี้</h2>
  <ul>
    <li><strong>สมาชิก / Login</strong> — register (room regex + password policy), brute-force, session timeout, regenerate id</li>
    <li><strong>แจ้งซ่อม CRUD</strong> — prepared statements, validation, ownership</li>
    <li><strong>กระดานข่าว + คอมเมนต์</strong> — XSS encoding, CSRF on POST</li>
    <li><strong>แนบรูป + Security Log</strong> — MIME/size, นอก web root, download authz, admin audit log</li>
  </ul>
  <p class="meta">Demo: resident01 / Resident1234 · resident02 / Resident1234 · admin01 / Admin1234</p>
  <p class="meta">สร้าง DB user เอง (SELECT/INSERT/UPDATE/DELETE เท่านั้น) — ไม่รวมใน init.sql</p>
  <p class="meta">เปิดผ่าน IP เครื่องได้ เช่น <code>http://&lt;IP&gt;:8080</code> · Grader <code>:3000</code> · phpMyAdmin <code>:8081</code></p>
</div>
<?php render_footer(); ?>

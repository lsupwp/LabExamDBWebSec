<?php
/**
 * Lab08/09 — INSECURE create ticket (weak validation, string SQL, insecure errors).
 */
declare(strict_types=1);

require_once __DIR__ . '/includes/auth_check.php';
require_once __DIR__ . '/includes/layout.php';

$user = require_login();
$errors = [];

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    // INSECURE: no CSRF
    $category = (string)($_POST['category'] ?? '');
    $title = (string)($_POST['title'] ?? '');
    $description = (string)($_POST['description'] ?? '');

    // INSECURE: no allowlist / length checks server-side

    $sql = "INSERT INTO repair_tickets (resident_id, room_code, category, title, description, status) VALUES ("
        . (int)$user['id'] . ","
        . "'" . $mysqli->real_escape_string($user['room_code']) . "',"
        . "'" . $mysqli->real_escape_string($category) . "',"
        . "'" . $mysqli->real_escape_string($title) . "',"
        . "'" . $mysqli->real_escape_string($description) . "',"
        . "'open')";
    if ($mysqli->query($sql)) {
        header('Location: /repairs.php?msg=created');
        exit;
    }
    $errors[] = 'Database error: ' . $mysqli->error;
}

render_header('สร้างใบแจ้งซ่อม');
?>
<h1>สร้างใบแจ้งซ่อม</h1>
<?php foreach ($errors as $e): ?><div class="msg err"><?= h($e) ?></div><?php endforeach; ?>
<div class="card">
  <p class="meta">ห้องของคุณ: <strong><?= h($user['room_code']) ?></strong></p>
  <!-- TODO Lab02: ใส่ method="post" ให้ถูกต้อง -->
  <form action="/repair_create.php" enctype="multipart/form-data">
    <label>หมวด</label>
    <select name="category" required>
      <?php foreach (ALLOWED_REPAIR_CATEGORIES as $c): ?>
        <option value="<?= h($c) ?>"><?= h($c) ?></option>
      <?php endforeach; ?>
    </select>
    <label>หัวข้อ</label>
    <input name="title" maxlength="150" required placeholder="เช่น น้ำหยด, ไฟดับ">
    <label>รายละเอียด</label>
    <textarea name="description" rows="4" required></textarea>
    <p class="meta">แนบรูปหลังสร้างใบได้ที่หน้ารายละเอียด (Lab12)</p>
    <p style="margin-top:1rem"><button type="submit">บันทึก</button></p>
  </form>
</div>
<?php render_footer(); ?>

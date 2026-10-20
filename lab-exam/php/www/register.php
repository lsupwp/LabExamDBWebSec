<?php
/**
 * Lab01/02/03/06/09 — INSECURE registration.
 * Must: secure errors (Lab01), method post (Lab02), password_hash (Lab03),
 * password policy (Lab06), room regex (Lab09), prepared INSERT.
 */
declare(strict_types=1);

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/layout.php';

$errors = [];
$forceDbError = isset($_GET['database_error_test']);

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $username = trim((string)($_POST['username'] ?? ''));
    $fullName = trim((string)($_POST['full_name'] ?? ''));
    $room = trim((string)($_POST['room_code'] ?? ''));
    $phone = trim((string)($_POST['phone'] ?? ''));
    $password = (string)($_POST['password'] ?? '');

    // INSECURE Lab06/09: no server-side regex / password policy — trusts HTML only.
    // Lab09: if room invalid → $errors[] = 'EXAM_MSG:ROOM_INVALID';
    // Lab06: reject weak passwords server-side

    if ($forceDbError) {
        // INSECURE Lab01: leaks DB error — use EXAM_MSG:GENERIC_ERROR + error_log instead
        try {
            $mysqli->query('INSERT INTO residents_missing VALUES (1)');
            $errors[] = 'Database error: ' . $mysqli->error;
        } catch (Throwable $e) {
            $errors[] = 'Database error: ' . $e->getMessage();
        }
    } else {
        // INSECURE Lab03: stores plaintext password — use password_hash(..., PASSWORD_BCRYPT)
        $stored = $password;
        $role = 'resident';
        $sql = "INSERT INTO residents (username, password_hash, full_name, room_code, phone, role) VALUES ("
            . "'" . $mysqli->real_escape_string($username) . "',"
            . "'" . $mysqli->real_escape_string($stored) . "',"
            . "'" . $mysqli->real_escape_string($fullName) . "',"
            . "'" . $mysqli->real_escape_string($room) . "',"
            . "'" . $mysqli->real_escape_string($phone) . "',"
            . "'" . $role . "')";
        try {
            if ($mysqli->query($sql)) {
                header('Location: /login.php?msg=registered');
                exit;
            }
            // INSECURE Lab01
            $errors[] = 'Database error: ' . $mysqli->error;
        } catch (Throwable $e) {
            $errors[] = 'Database error: ' . $e->getMessage();
        }
    }
}

render_header('Register');
?>
<h1>ลงทะเบียนลูกบ้าน</h1>
<?php foreach ($errors as $e): ?><div class="msg err"><?= h($e) ?></div><?php endforeach; ?>
<div class="card">
  <!-- TODO Lab02: ใส่ method="post" ให้ถูกต้อง -->
  <form action="/register.php<?= $forceDbError ? '?database_error_test=1' : '' ?>">
    <label>Username</label>
    <input name="username" required maxlength="50" pattern="[A-Za-z0-9_]{4,50}">
    <label>ชื่อ-นามสกุล</label>
    <input name="full_name" required maxlength="100">
    <label>รหัสห้อง (เช่น A-101)</label>
    <input name="room_code" required maxlength="20" pattern="[A-Z]-\d{3}" placeholder="A-101">
    <label>เบอร์โทร (ขึ้นต้น 0)</label>
    <input name="phone" required maxlength="20" pattern="0\d{8,9}" placeholder="0812345678">
    <label>Password (≥8, มีพิมพ์ใหญ่ เล็ก และตัวเลข)</label>
    <input type="password" name="password" required minlength="8">
    <p style="margin-top:1rem"><button type="submit">Register</button></p>
  </form>
  <p class="meta">Lab03: ต้อง <code>password_hash</code> · Lab01: ห้ามโชว์ <code>$mysqli->error</code> · Lab06/09: ตรวจฝั่งเซิร์ฟเวอร์</p>
</div>
<?php render_footer(); ?>

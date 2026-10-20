<?php
/**
 * Ticket detail + insecure upload + insecure cancel (no ownership/CSRF).
 */
declare(strict_types=1);

require_once __DIR__ . '/includes/auth_check.php';
require_once __DIR__ . '/includes/layout.php';

$user = require_login();
$id = (int)($_GET['id'] ?? 0);

$stmt = $mysqli->prepare(
    'SELECT t.*, r.username, r.full_name FROM repair_tickets t
     JOIN residents r ON r.id = t.resident_id WHERE t.id = ?'
);
$stmt->bind_param('i', $id);
$stmt->execute();
$ticket = $stmt->get_result()->fetch_assoc();

if (!$ticket) {
    http_response_code(404);
    exit('Not found');
}

// INSECURE: any logged-in user can view any ticket (admin OK; residents should be limited).

$fstmt = $mysqli->prepare('SELECT * FROM ticket_files WHERE ticket_id = ? ORDER BY id DESC');
$fstmt->bind_param('i', $id);
$fstmt->execute();
$files = $fstmt->get_result()->fetch_all(MYSQLI_ASSOC);

$uploadMsg = '';
$uploadErr = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && ($_POST['action'] ?? '') === 'upload') {
    // INSECURE upload: original name, web root, no MIME/ext/size checks, no CSRF
    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        $uploadErr = 'อัปโหลดไม่สำเร็จ';
    } else {
        $original = basename((string)$_FILES['photo']['name']);
        $dir = __DIR__ . '/uploads_insecure';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        $dest = $dir . '/' . $original;
        if (move_uploaded_file($_FILES['photo']['tmp_name'], $dest)) {
            $mime = (string)($_FILES['photo']['type'] ?? 'application/octet-stream');
            $size = (int)$_FILES['photo']['size'];
            $uid = $user['id'];
            $stype = 'insecure';
            $ins = $mysqli->prepare(
                'INSERT INTO ticket_files (ticket_id, original_name, stored_name, mime_type, file_size, uploaded_by, storage_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $ins->bind_param('isssiis', $id, $original, $original, $mime, $size, $uid, $stype);
            $ins->execute();
            $uploadMsg = 'อัปโหลดไปที่ /uploads_insecure/' . $original;
            $fstmt->execute();
            $files = $fstmt->get_result()->fetch_all(MYSQLI_ASSOC);
        } else {
            $uploadErr = 'ย้ายไฟล์ไม่สำเร็จ';
        }
    }
}

render_header('รายละเอียดใบแจ้งซ่อม');
?>
<h1>#<?= (int)$ticket['id'] ?> · <?= h($ticket['title']) ?></h1>
<?php if ($uploadMsg): ?><div class="msg warn"><?= h($uploadMsg) ?></div><?php endif; ?>
<?php if ($uploadErr): ?><div class="msg err"><?= h($uploadErr) ?></div><?php endif; ?>

<div class="card">
  <p class="meta"><?= h($ticket['room_code']) ?> · <?= h($ticket['category']) ?> · <?= h($ticket['status']) ?> · โดย <?= h($ticket['full_name']) ?></p>
  <p><?= nl2br(h($ticket['description'])) ?></p>

  <p style="margin-top:1rem">
    <a class="btn secondary" href="/repair_edit.php?id=<?= (int)$ticket['id'] ?>">แก้ไข</a>
  </p>
  <!-- TODO Lab02: ใส่ method="post" ให้ถูกต้อง -->
  <form action="/repair_actions.php" style="margin-top:.75rem">
    <input type="hidden" name="action" value="cancel">
    <input type="hidden" name="ticket_id" value="<?= (int)$ticket['id'] ?>">
    <button type="submit">ยกเลิกใบแจ้งซ่อม</button>
  </form>
</div>

<div class="card">
  <h2>แนบรูปความเสียหาย</h2>
  <!-- TODO Lab02: ใส่ method="post" ให้ถูกต้อง -->
  <form enctype="multipart/form-data" action="/repair_view.php?id=<?= (int)$id ?>">
    <input type="hidden" name="action" value="upload">
    <input type="file" name="photo" accept="image/*" required>
    <p style="margin-top:.75rem"><button type="submit">Upload</button></p>
  </form>
  <table>
    <thead><tr><th>ไฟล์</th><th>ขนาด</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($files as $f): ?>
      <tr>
        <td><?= h($f['original_name']) ?></td>
        <td><?= (int)$f['file_size'] ?></td>
        <td><a href="/download.php?id=<?= (int)$f['id'] ?>">Download</a></td>
      </tr>
    <?php endforeach; ?>
    <?php if (!$files): ?><tr><td colspan="3">ยังไม่มีไฟล์</td></tr><?php endif; ?>
    </tbody>
  </table>
</div>
<p><a href="/repairs.php">← กลับรายการ</a></p>
<?php render_footer(); ?>

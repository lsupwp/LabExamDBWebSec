<?php
/**
 * Lab10 — INSECURE edit (no ownership check on load/save).
 */
declare(strict_types=1);

require_once __DIR__ . '/includes/auth_check.php';
require_once __DIR__ . '/includes/layout.php';

$user = require_login();
$id = (int)($_GET['id'] ?? $_POST['ticket_id'] ?? 0);

$stmt = $mysqli->prepare('SELECT * FROM repair_tickets WHERE id = ?');
$stmt->bind_param('i', $id);
$stmt->execute();
$ticket = $stmt->get_result()->fetch_assoc();
if (!$ticket) {
    http_response_code(404);
    exit('Not found');
}

// INSECURE: no ownership / admin gate before showing edit form.

$errors = [];
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    // INSECURE: no CSRF, no ownership on update
    $category = (string)($_POST['category'] ?? '');
    $title = (string)($_POST['title'] ?? '');
    $description = (string)($_POST['description'] ?? '');
    $sql = "UPDATE repair_tickets SET category='" . $mysqli->real_escape_string($category)
        . "', title='" . $mysqli->real_escape_string($title)
        . "', description='" . $mysqli->real_escape_string($description)
        . "', updated_at=NOW() WHERE id=" . (int)$id;
    if ($mysqli->query($sql)) {
        header('Location: /repairs.php?msg=updated');
        exit;
    }
    $errors[] = 'Database error: ' . $mysqli->error;
}

render_header('แก้ไขใบแจ้งซ่อม');
?>
<h1>แก้ไข #<?= (int)$ticket['id'] ?></h1>
<?php foreach ($errors as $e): ?><div class="msg err"><?= h($e) ?></div><?php endforeach; ?>
<div class="card">
  <!-- TODO Lab02: ใส่ method="post" ให้ถูกต้อง -->
  <form action="/repair_edit.php?id=<?= (int)$id ?>">
    <input type="hidden" name="ticket_id" value="<?= (int)$id ?>">
    <label>หมวด</label>
    <select name="category" required>
      <?php foreach (ALLOWED_REPAIR_CATEGORIES as $c): ?>
        <option value="<?= h($c) ?>" <?= $ticket['category'] === $c ? 'selected' : '' ?>><?= h($c) ?></option>
      <?php endforeach; ?>
    </select>
    <label>หัวข้อ</label>
    <input name="title" maxlength="150" required value="<?= h($ticket['title']) ?>">
    <label>รายละเอียด</label>
    <textarea name="description" rows="4" required><?= h($ticket['description']) ?></textarea>
    <p style="margin-top:1rem"><button type="submit">บันทึก</button></p>
  </form>
</div>
<?php render_footer(); ?>

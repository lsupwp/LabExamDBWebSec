<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth_check.php';
require_once __DIR__ . '/includes/layout.php';

$user = require_login();
$flash = $_GET['msg'] ?? '';

if (is_admin($user)) {
    // INSECURE search: string concat (Lab08) — admin keyword filter
    $q = (string)($_GET['q'] ?? '');
    if ($q !== '') {
        $sql = "SELECT t.*, r.username FROM repair_tickets t
                JOIN residents r ON r.id = t.resident_id
                WHERE t.title LIKE '%" . $q . "%' OR t.description LIKE '%" . $q . "%'
                ORDER BY t.id DESC";
        $result = $mysqli->query($sql);
        if ($result === false) {
            render_header('แจ้งซ่อม');
            echo '<div class="msg err">SQL Error: ' . h($mysqli->error) . '</div>';
            render_footer();
            exit;
        }
        $tickets = $result->fetch_all(MYSQLI_ASSOC);
        $generatedSql = $sql;
    } else {
        $tickets = $mysqli->query(
            'SELECT t.*, r.username FROM repair_tickets t
             JOIN residents r ON r.id = t.resident_id
             ORDER BY t.id DESC'
        )->fetch_all(MYSQLI_ASSOC);
        $generatedSql = '';
    }
} else {
    $rid = $user['id'];
    $stmt = $mysqli->prepare(
        'SELECT t.*, r.username FROM repair_tickets t
         JOIN residents r ON r.id = t.resident_id
         WHERE t.resident_id = ?
         ORDER BY t.id DESC'
    );
    $stmt->bind_param('i', $rid);
    $stmt->execute();
    $tickets = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $generatedSql = '';
    $q = '';
}

render_header('แจ้งซ่อม');
?>
<h1>ใบแจ้งซ่อม</h1>
<?php if ($flash === 'created'): ?><div class="msg ok">สร้างใบแจ้งซ่อมแล้ว</div><?php endif; ?>
<?php if ($flash === 'updated'): ?><div class="msg ok">อัปเดตแล้ว</div><?php endif; ?>
<?php if ($flash === 'cancelled'): ?><div class="msg ok">ยกเลิกแล้ว</div><?php endif; ?>
<?php if ($flash === 'forbidden'): ?><div class="msg err">ไม่มีสิทธิ์</div><?php endif; ?>

<div class="card">
  <p><a class="btn" href="/repair_create.php">+ สร้างใบแจ้งซ่อม</a></p>
  <?php if (is_admin($user)): ?>
    <!-- TODO Lab02: ค้นหาควรใช้ method="get" -->
    <form action="/repairs.php" style="margin-top:1rem">
      <label>ค้นหา (admin — starter ต่อ SQL string)</label>
      <input name="q" value="<?= h($q ?? '') ?>" placeholder="เช่น น้ำหยด">
      <p style="margin-top:.75rem"><button type="submit">Search</button></p>
    </form>
    <?php if (!empty($generatedSql)): ?>
      <p class="meta">Generated SQL:</p>
      <pre><?= h($generatedSql) ?></pre>
    <?php endif; ?>
  <?php endif; ?>
</div>

<div class="card">
  <table>
    <thead>
      <tr><th>ID</th><th>ห้อง</th><th>หมวด</th><th>หัวข้อ</th><th>สถานะ</th><th></th></tr>
    </thead>
    <tbody>
    <?php foreach ($tickets as $t): ?>
      <tr>
        <td><?= (int)$t['id'] ?></td>
        <td><?= h($t['room_code']) ?></td>
        <td><?= h($t['category']) ?></td>
        <td><?= h($t['title']) ?></td>
        <td><?= h($t['status']) ?></td>
        <td><a href="/repair_view.php?id=<?= (int)$t['id'] ?>">เปิด</a></td>
      </tr>
    <?php endforeach; ?>
    <?php if (!$tickets): ?><tr><td colspan="6">ยังไม่มีรายการ</td></tr><?php endif; ?>
    </tbody>
  </table>
</div>
<?php render_footer(); ?>

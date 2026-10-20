<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth_check.php';
require_once __DIR__ . '/includes/layout.php';

$user = require_login();
// INSECURE: no admin role check — any resident can open this page.
// Lab11 fix: if role !== 'admin' → http_response_code(403); exit('EXAM_MSG:FORBIDDEN');

$rows = $mysqli->query('SELECT * FROM security_logs ORDER BY id DESC LIMIT 100');
$logs = $rows ? $rows->fetch_all(MYSQLI_ASSOC) : [];

render_header('Security Logs');
?>
<h1>Security Audit Log</h1>
<div class="card">
  <p class="meta">Starter เปิดให้ทุกคนที่ login ได้ — ต้องจำกัดเฉพาะ admin และต้องมีเหตุการณ์ LOGIN / FILE_DOWNLOAD จาก security_log()</p>
  <table>
    <thead><tr><th>ID</th><th>User</th><th>Event</th><th>Status</th><th>IP</th><th>Details</th><th>At</th></tr></thead>
    <tbody>
    <?php foreach ($logs as $r): ?>
      <tr>
        <td><?= (int)$r['id'] ?></td>
        <td><?= h((string)$r['username']) ?></td>
        <td><?= h($r['event_type']) ?></td>
        <td><?= h($r['status']) ?></td>
        <td><?= h($r['ip_address']) ?></td>
        <td><?= h($r['details']) ?></td>
        <td><?= h($r['created_at']) ?></td>
      </tr>
    <?php endforeach; ?>
    <?php if (!$logs): ?><tr><td colspan="7">ยังไม่มี log (security_log ยังเป็น placeholder)</td></tr><?php endif; ?>
    </tbody>
  </table>
</div>
<?php render_footer(); ?>

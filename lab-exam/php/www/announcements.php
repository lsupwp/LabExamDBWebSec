<?php
/**
 * Lab10/11 — board with INSECURE comment output (raw echo) and missing CSRF.
 */
declare(strict_types=1);

require_once __DIR__ . '/includes/auth_check.php';
require_once __DIR__ . '/includes/layout.php';

$user = require_login();
$flash = $_GET['msg'] ?? '';

$posts = $mysqli->query('SELECT * FROM announcements ORDER BY id DESC')->fetch_all(MYSQLI_ASSOC);

render_header('กระดานข่าว');
?>
<h1>กระดานข่าวส่วนกลาง</h1>
<?php if ($flash === 'commented'): ?><div class="msg ok">ส่งคอมเมนต์แล้ว</div><?php endif; ?>
<?php if ($flash === 'forbidden'): ?><div class="msg err">คอมเมนต์ถูกปฏิเสธ</div><?php endif; ?>

<?php foreach ($posts as $p): ?>
  <?php
    $aid = (int)$p['id'];
    $cstmt = $mysqli->prepare(
        'SELECT c.*, r.username, r.room_code FROM announcement_comments c
         JOIN residents r ON r.id = c.resident_id
         WHERE c.announcement_id = ? ORDER BY c.id ASC'
    );
    $cstmt->bind_param('i', $aid);
    $cstmt->execute();
    $comments = $cstmt->get_result()->fetch_all(MYSQLI_ASSOC);
  ?>
  <div class="card">
    <h2><?= h($p['title']) ?></h2>
    <p class="meta">โดย <?= h($p['posted_by']) ?> · <?= h($p['created_at']) ?></p>
    <p><?= nl2br(h($p['body'])) ?></p>

    <h3>ความคิดเห็น</h3>
    <?php foreach ($comments as $c): ?>
      <div style="border-top:1px solid var(--line); padding:.6rem 0;">
        <div class="meta"><?= h($c['username']) ?> (<?= h($c['room_code']) ?>)</div>
        <div class="comment-body">
          <?php
          // INSECURE: raw echo enables Stored XSS. Use h($c['comment']).
          echo $c['comment'];
          ?>
        </div>
      </div>
    <?php endforeach; ?>

    <!-- TODO Lab02: ใส่ method="post" ให้ถูกต้อง -->
    <form action="/announcement_actions.php" style="margin-top:.75rem">
      <input type="hidden" name="action" value="comment">
      <input type="hidden" name="announcement_id" value="<?= $aid ?>">
      <label>คอมเมนต์</label>
      <textarea name="comment" rows="2" required></textarea>
      <p style="margin-top:.5rem"><button type="submit">ส่งคอมเมนต์</button></p>
    </form>
  </div>
<?php endforeach; ?>
<?php render_footer(); ?>

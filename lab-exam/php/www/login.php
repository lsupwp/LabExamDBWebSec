<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/layout.php';

$msg = $_GET['msg'] ?? '';
$messages = [
    'bad' => 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'locked' => 'ลองเข้าสู่ระบบผิดหลายครั้ง โปรดรอสักครู่',
    'timeout' => 'Session หมดอายุ',
    'ua' => 'ตรวจพบการเปลี่ยนเบราว์เซอร์ กรุณาเข้าสู่ระบบใหม่',
    'logout' => 'ออกจากระบบแล้ว',
    'login_required' => 'กรุณาเข้าสู่ระบบก่อน',
    'registered' => 'สมัครสำเร็จ กรุณาเข้าสู่ระบบ',
];

render_header('Login');
?>
<h1>เข้าสู่ระบบ</h1>
<?php if (isset($messages[$msg])): ?>
  <div class="msg <?= in_array($msg, ['logout', 'registered'], true) ? 'ok' : 'err' ?>"><?= h($messages[$msg]) ?></div>
<?php endif; ?>
<div class="card">
  <p class="meta">Session ID ก่อน login: <code><?= h(session_id()) ?></code></p>
  <!-- TODO Lab02: ใส่ method="post" ให้ถูกต้อง -->
  <form action="/login_process.php">
    <label>Username</label>
    <input name="username" required maxlength="50" autocomplete="username">
    <label>Password</label>
    <input type="password" name="password" required autocomplete="current-password">
    <p style="margin-top:1rem"><button type="submit">Login</button></p>
  </form>
  <p class="meta">ยังไม่มีบัญชี? <a href="/register.php">ลงทะเบียนลูกบ้าน</a></p>
</div>
<?php render_footer(); ?>

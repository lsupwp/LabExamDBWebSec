<?php
/**
 * Lab04/05/07/12 — INSECURE login.
 * Must: prepared SELECT + password_verify (Lab04), login_attempts lockout (Lab05),
 * regenerate + UA (Lab07), security_log (Lab12).
 */
declare(strict_types=1);

require_once __DIR__ . '/includes/config.php';
require_post();

$username = trim((string)($_POST['username'] ?? ''));
$password = (string)($_POST['password'] ?? '');

if ($username === '' || $password === '') {
    header('Location: /login.php?msg=bad');
    exit;
}

// INSECURE Lab05: missing attempt limiting against login_attempts table.
// Lab05: after 5 failed attempts for this username → exit('EXAM_MSG:LOGIN_LOCKED') or redirect with that message.

// INSECURE Lab04: string concat SQLi + trusts any returned row (no password_verify).
// Fix: prepare + bind_param for username, then password_verify($password, $row['password_hash']).
$sql = "SELECT id, username, password_hash, role, room_code, full_name FROM residents WHERE username = '"
    . $username . "' LIMIT 1";
$row = null;
try {
    $result = $mysqli->query($sql);
    $row = $result ? $result->fetch_assoc() : null;
} catch (Throwable $e) {
    $row = null;
}
$ok = (bool)$row;

if (!$ok) {
    // INSECURE Lab05/12: no failed-attempt row / no LOGIN_FAILED log
    header('Location: /login.php?msg=bad');
    exit;
}

// INSECURE Lab07: session id is not rotated after auth success
$_SESSION['logged_in'] = true;
$_SESSION['user_id'] = (int)$row['id'];
$_SESSION['username'] = $row['username'];
$_SESSION['role'] = $row['role'];
$_SESSION['room_code'] = $row['room_code'];
$_SESSION['full_name'] = $row['full_name'];
$_SESSION['login_time'] = time();
$_SESSION['last_activity'] = time();
// INSECURE: browser fingerprint is not bound to the session

header('Location: /repairs.php');
exit;

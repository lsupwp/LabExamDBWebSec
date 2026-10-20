<?php
/**
 * Lab07/12 — INSECURE logout.
 * Must: POST + CSRF, clear session, expire cookie, session_destroy, cache headers, log event.
 */
declare(strict_types=1);

require_once __DIR__ . '/includes/config.php';

// INSECURE: accepts any method, no CSRF, cookie not explicitly expired.
$_SESSION = [];
session_destroy();
header('Location: /login.php?msg=logout');
exit;

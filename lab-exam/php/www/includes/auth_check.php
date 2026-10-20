<?php
/**
 * Lab07 — INSECURE auth gate.
 * Must enforce login, idle/absolute timeout, User-Agent binding.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

if (empty($_SESSION['logged_in'])) {
    header('Location: /login.php?msg=login_required');
    exit;
}

// INSECURE: no idle / absolute timeout checks.
// INSECURE: no User-Agent change detection.

$_SESSION['last_activity'] = time();

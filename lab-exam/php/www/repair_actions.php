<?php
/**
 * Lab10/11 — INSECURE cancel action (no ownership, CSRF stub always true).
 */
declare(strict_types=1);

require_once __DIR__ . '/includes/auth_check.php';
require_post();

$user = require_login();
$action = (string)($_POST['action'] ?? '');

if (!verify_csrf($_POST['csrf_token'] ?? null)) {
    header('Location: /repairs.php?msg=forbidden');
    exit;
}

if ($action === 'cancel') {
    $ticketId = (int)($_POST['ticket_id'] ?? 0);
    // INSECURE: cancels any ticket by id
    $stmt = $mysqli->prepare("UPDATE repair_tickets SET status='cancelled', updated_at=NOW() WHERE id = ?");
    $stmt->bind_param('i', $ticketId);
    $stmt->execute();
    header('Location: /repairs.php?msg=cancelled');
    exit;
}

header('Location: /repairs.php?msg=forbidden');
exit;

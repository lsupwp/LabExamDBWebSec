<?php
/**
 * Lab12 — INSECURE download (no ownership/admin check).
 */
declare(strict_types=1);

require_once __DIR__ . '/includes/auth_check.php';
$user = require_login();

$id = (int)($_GET['id'] ?? 0);
$stmt = $mysqli->prepare(
    'SELECT f.*, t.resident_id AS ticket_owner
     FROM ticket_files f
     JOIN repair_tickets t ON t.id = f.ticket_id
     WHERE f.id = ?'
);
$stmt->bind_param('i', $id);
$stmt->execute();
$file = $stmt->get_result()->fetch_assoc();

if (!$file) {
    http_response_code(404);
    exit('Not found');
}

// INSECURE: missing authorization before serving the file.
// Should also record a download event via security_log.

$path = $file['storage_type'] === 'secure'
    ? '/var/www/uploads_secure/' . $file['stored_name']
    : __DIR__ . '/uploads_insecure/' . $file['stored_name'];

if (!is_file($path)) {
    http_response_code(404);
    exit('Missing file');
}

header('Content-Type: ' . $file['mime_type']);
header('Content-Disposition: attachment; filename="' . $file['original_name'] . '"');
header('Content-Length: ' . (string)filesize($path));
readfile($path);
exit;

<?php
/**
 * Lab11 — INSECURE comment POST (CSRF stub always true).
 */
declare(strict_types=1);

require_once __DIR__ . '/includes/auth_check.php';
require_post();

$user = require_login();

if (!verify_csrf($_POST['csrf_token'] ?? null)) {
    // Lab11: when CSRF is real, respond with exact marker for grader:
    //   http_response_code(403); exit('EXAM_MSG:CSRF_REJECTED');
    header('Location: /announcements.php?msg=forbidden');
    exit;
}

$action = (string)($_POST['action'] ?? '');
if ($action === 'comment') {
    $aid = (int)($_POST['announcement_id'] ?? 0);
    $comment = trim((string)($_POST['comment'] ?? ''));
    if ($aid <= 0 || $comment === '') {
        header('Location: /announcements.php?msg=forbidden');
        exit;
    }
    $rid = $user['id'];
    $stmt = $mysqli->prepare(
        'INSERT INTO announcement_comments (announcement_id, resident_id, comment) VALUES (?, ?, ?)'
    );
    $stmt->bind_param('iis', $aid, $rid, $comment);
    $stmt->execute();
    header('Location: /announcements.php?msg=commented');
    exit;
}

header('Location: /announcements.php?msg=forbidden');
exit;

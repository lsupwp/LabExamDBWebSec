<?php
session_start();

header('Content-Type: text/plain; charset=UTF-8');
echo "=== Dangerous Uploaded PHP Demo ===\n\n";
echo "=== Uploaded PHP File Executed ===\n\n";

echo "Username: "
    . ($_SESSION['username'] ?? 'Not found') . "\n";

echo "Role: "
    . ($_SESSION['role'] ?? 'Not found') . "\n";

echo "CSRF Token: "
    . ($_SESSION['csrf_token'] ?? 'Not found') . "\n";
<?php
/**
 * Smart Condo Portal — INSECURE starter.
 * Fix cookie flags, timeouts, CSRF, security_log, least-privilege DB user.
 */

declare(strict_types=1);

const IDLE_TIMEOUT = 600;
const ABSOLUTE_TIMEOUT = 3600;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 5;

const ALLOWED_REPAIR_CATEGORIES = ['Plumbing', 'Electrical', 'Structural', 'Other'];
const ALLOWED_TICKET_STATUS = ['open', 'in_progress', 'cancelled', 'done'];
const MAX_UPLOAD_BYTES = 2_097_152; // 2 MB
const ALLOWED_UPLOAD_EXT = ['jpg', 'jpeg', 'png'];
const ALLOWED_UPLOAD_MIME = ['image/jpeg', 'image/png'];

// Room code example: A-101  (student must enforce with preg_match)
const ROOM_CODE_PATTERN = '/^[A-Z]-\d{3}$/';
const PHONE_PATTERN = '/^0\d{8,9}$/';
// Password policy hint: >=8, upper, lower, digit (enforce on register)

// Load .env next to project root (zip root) or one level above includes/
(function (): void {
    $candidates = [
        dirname(__DIR__) . '/.env',
        dirname(__DIR__, 2) . '/.env',
        __DIR__ . '/.env',
    ];
    foreach ($candidates as $envFile) {
        if (!is_readable($envFile)) {
            continue;
        }
        foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            // allow shell-style `export DB_NAME=…` (same as grader parseEnv)
            if (preg_match('/^export\s+/i', $line)) {
                $line = preg_replace('/^export\s+/i', '', $line) ?? $line;
            }
            [$k, $v] = array_map('trim', explode('=', $line, 2));
            $v = trim($v, "\"'");
            if ($k !== '' && getenv($k) === false) {
                putenv($k . '=' . $v);
                $_ENV[$k] = $v;
            }
        }
        break;
    }
})();

$dbHost = getenv('DB_HOST') ?: 'db';
$dbName = getenv('DB_NAME') ?: 'db_labexam';
// INSECURE: defaults to privileged DB account. Use .env + least-privilege user (Lab08).
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') ?: 'RootPass1234';

$mysqli = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
if ($mysqli->connect_error) {
    // INSECURE: leaks connection details.
    die('DB connect failed: ' . $mysqli->connect_error);
}
$mysqli->set_charset('utf8mb4');

// INSECURE: no HttpOnly / Secure / SameSite before session_start().
session_start();

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        http_response_code(405);
        header('Content-Type: text/plain; charset=utf-8');
        exit("Method Not Allowed\n\nLab02: ใส่ method=\"post\" ใน <form> ที่ส่งมาหน้านี้ (browser default = GET)");
    }
}

/** INSECURE stubs — implement real CSRF (Lab11). */
function csrf_token(): string
{
    return '';
}

function csrf_field(): string
{
    return '';
}

function verify_csrf(?string $token): bool
{
    return true;
}

/** INSECURE stub — implement INSERT into security_logs without secrets (Lab12). */
function security_log(?string $username, string $eventType, string $status, string $details): void
{
    // placeholder
}

function current_user(): ?array
{
    if (empty($_SESSION['logged_in'])) {
        return null;
    }
    return [
        'id' => (int)($_SESSION['user_id'] ?? 0),
        'username' => (string)($_SESSION['username'] ?? ''),
        'role' => (string)($_SESSION['role'] ?? 'resident'),
        'room_code' => (string)($_SESSION['room_code'] ?? ''),
        'full_name' => (string)($_SESSION['full_name'] ?? ''),
    ];
}

function require_login(): array
{
    $user = current_user();
    if ($user === null) {
        header('Location: /login.php?msg=login_required');
        exit;
    }
    return $user;
}

function is_admin(array $user): bool
{
    return ($user['role'] ?? '') === 'admin';
}

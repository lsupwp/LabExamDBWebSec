<?php
declare(strict_types=1);

function render_header(string $title): void
{
    $user = current_user();
    echo '<!doctype html><html lang="th"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>' . h($title) . ' | Smart Condo Portal</title>';
    echo '<link rel="stylesheet" href="/assets/style.css">';
    echo '</head><body><header class="top">';
    echo '<a class="brand" href="/index.php">Smart Condo Portal</a><nav>';
    echo '<a href="/repairs.php">แจ้งซ่อม</a>';
    echo '<a href="/announcements.php">ข่าวสาร</a>';
    if ($user) {
        if (is_admin($user)) {
            echo '<a href="/admin_logs.php">Security Logs</a>';
        }
        echo '<span class="who">' . h($user['full_name'] ?: $user['username']);
        echo ' · ' . h($user['room_code']) . ' (' . h($user['role']) . ')</span>';
        // TODO Lab02: ใส่ method="post" ใน form logout
        echo '<form class="inline" action="/logout.php">';
        echo '<button type="submit">Logout</button></form>';
    } else {
        echo '<a href="/login.php">Login</a>';
        echo '<a href="/register.php">Register</a>';
    }
    echo '</nav></header><main class="wrap">';
}

function render_footer(): void
{
    echo '</main><footer class="foot">Smart Condo &amp; Apartment Portal — insecure practice starter</footer></body></html>';
}

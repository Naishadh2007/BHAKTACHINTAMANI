<?php
/**
 * Pure PHP Gateway — no Laravel dependency.
 * Routes API calls to dedicated PHP scripts and serves React SPA for everything else.
 */

$uri = strtok(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '?');
$dir = __DIR__;

// Admin Auth: login, me, logout
if (preg_match('#^/(public/)?api/admin/(login|me|logout)#i', $uri)) {
    require $dir . '/api_admin.php';
    exit;
}

// Admin Chapters CRUD
if (preg_match('#^/(public/)?api/admin/chapters#i', $uri)) {
    require $dir . '/api_admin_chapters.php';
    exit;
}

// Admin Users CRUD
if (preg_match('#^/(public/)?api/admin/users#i', $uri)) {
    require $dir . '/api_admin_users.php';
    exit;
}

// Feedbacks (Public & Admin)
if (preg_match('#^/(public/)?api/(admin/)?feedbacks?#i', $uri)) {
    require $dir . '/api_feedbacks.php';
    exit;
}

// Public Chapters
if (preg_match('#^/(public/)?api/chapters#i', $uri)) {
    require $dir . '/api_chapters.php';
    exit;
}

// Serve React SPA for all other routes
$indexHtml = $dir . '/index.html';
if (file_exists($indexHtml)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($indexHtml);
} else {
    http_response_code(404);
    echo 'Not found';
}
exit;

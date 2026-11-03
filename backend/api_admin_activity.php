<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); exit; }

require __DIR__ . '/admin_activity.php';
$isLocal = in_array(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0], ['localhost', '127.0.0.1', '']) || php_sapi_name() === 'cli-server';
try {
    $pdo = $isLocal
        ? new PDO('mysql:host=127.0.0.1;dbname=bhaktachintamani;charset=utf8mb4', 'root', '')
        : new PDO('mysql:host=sql107.infinityfree.com;dbname=if0_42640441_bhaktchintamani;charset=utf8mb4', 'if0_42640441', 'Naishadhbv2007');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    requireAdmin($pdo, 'manage_users');
    $pdo->exec("CREATE TABLE IF NOT EXISTS admin_activity (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, admin_id BIGINT UNSIGNED NOT NULL, admin_name VARCHAR(255) NOT NULL, action VARCHAR(32) NOT NULL, subject VARCHAR(100) NOT NULL, subject_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX (created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $rows = $pdo->query('SELECT admin_name, action, subject, subject_id, created_at FROM admin_activity ORDER BY id DESC LIMIT 100')->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Could not load activity.']);
}

<?php
ini_set('display_errors', 0);
error_reporting(0);
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$isLocal = in_array(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0], ['localhost', '127.0.0.1', ''])
    || (php_sapi_name() === 'cli-server')
    || (isset($_SERVER['SERVER_ADDR']) && in_array($_SERVER['SERVER_ADDR'], ['127.0.0.1', '::1']));

if ($isLocal) {
    $host = '127.0.0.1';
    $user = 'root';
    $pass = '';
    $db   = 'bhaktachintamani';
    $port = 3306;
} else {
    $host = 'sql107.infinityfree.com';
    $user = 'if0_42640441';
    $pass = 'Naishadhbv2007';
    $db   = 'if0_42640441_bhaktchintamani';
    $port = 3306;
}

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Ensure admins table exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS `admins` (
      `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `is_super_admin` tinyint(1) NOT NULL DEFAULT '1',
      `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
      `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `created_at` timestamp NULL DEFAULT NULL,
      `updated_at` timestamp NULL DEFAULT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `admins_email_unique` (`email`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Ensure personal_access_tokens table exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
      `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `tokenable_id` bigint(20) UNSIGNED NOT NULL,
      `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
      `abilities` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      `last_used_at` timestamp NULL DEFAULT NULL,
      `expires_at` timestamp NULL DEFAULT NULL,
      `created_at` timestamp NULL DEFAULT NULL,
      `updated_at` timestamp NULL DEFAULT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
      KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Authentication must never reset stored credentials.

    // Detect action from ?action= param OR from REQUEST_URI path
    // e.g. POST /api/admin/login → action=login
    $action = isset($_GET['action']) ? $_GET['action'] : 'ping';
    if ($action === 'ping' && isset($_SERVER['REQUEST_URI'])) {
        if (preg_match('#/api/admin/(login|me|logout)#i', $_SERVER['REQUEST_URI'], $m)) {
            $action = strtolower($m[1]);
        }
    }

    // ── ACTION: PING / DEBUG ──
    if ($action === 'ping') {
        echo json_encode(['status' => 'ok']);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?: $_POST;

    // ── ACTION: LOGIN ──
    if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';

        if (!is_string($password) || $email === '' || $password === '') {
            http_response_code(422);
            echo json_encode(['message' => 'Email and password are required.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT * FROM admins WHERE LOWER(email) = LOWER(?)");
        $stmt->execute([$email]);
        $admin = $stmt->fetch();

        $isValid = $admin && password_verify($password, $admin['password']);

        if (!$isValid || !$admin) {
            http_response_code(401);
            echo json_encode(['message' => 'Invalid email or password. Please verify credentials.']);
            exit;
        }

        // Restore the canonical main admin role after a valid password check.
        if ($email === 'naishad@ssgd.com' && !(bool)$admin['is_super_admin']) {
            $pdo->prepare('UPDATE admins SET is_super_admin = 1 WHERE id = ?')->execute([$admin['id']]);
            $admin['is_super_admin'] = 1;
        }

        $plainToken = bin2hex(random_bytes(32));
        $hashedToken = hash('sha256', $plainToken);

        $stmtToken = $pdo->prepare("INSERT INTO personal_access_tokens (tokenable_type, tokenable_id, name, token, abilities, created_at, updated_at) VALUES (?, ?, 'admin-panel', ?, '[\"*\"]', NOW(), NOW())");
        $stmtToken->execute(['App\\Models\\Admin', $admin['id'], $hashedToken]);

        $permissions = json_decode($admin['permissions'] ?? '[]', true) ?: [
            'view_dashboard'  => true,
            'manage_chapters' => true,
            'manage_users'    => true,
            'manage_settings' => true,
        ];

        if (ob_get_length()) ob_clean();
        echo json_encode([
            'token' => $plainToken,
            'admin' => [
                'id'             => (int)$admin['id'],
                'name'           => $admin['name'],
                'email'          => $admin['email'],
                'is_super_admin' => (bool)$admin['is_super_admin'],
                'permissions'    => $permissions,
            ],
        ]);
        exit;
    }

    // ── ACTION: ME ──
    if ($action === 'me') {
        require_once __DIR__ . '/admin_activity.php';
        $admin = currentAdmin($pdo);
        if (!$admin) {
            http_response_code(401);
            echo json_encode(['message' => 'Unauthenticated']);
            exit;
        }
        if (strtolower($admin['email']) === 'naishad@ssgd.com' && !(bool)$admin['is_super_admin']) {
            $pdo->prepare('UPDATE admins SET is_super_admin = 1 WHERE id = ?')->execute([$admin['id']]);
            $admin['is_super_admin'] = 1;
        }

        $permissions = json_decode($admin['permissions'] ?? '[]', true) ?: [
            'view_dashboard'  => true,
            'manage_chapters' => true,
            'manage_users'    => true,
            'manage_settings' => true,
        ];

        echo json_encode([
            'id'             => (int)$admin['id'],
            'name'           => $admin['name'],
            'email'          => $admin['email'],
            'is_super_admin' => (bool)$admin['is_super_admin'],
            'permissions'    => $permissions,
        ]);
        exit;
    }

    // ── ACTION: LOGOUT ──
    if ($action === 'logout') {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!$authHeader && !empty($_SERVER['HTTP_X_ADMIN_TOKEN'])) {
            $authHeader = 'Bearer ' . $_SERVER['HTTP_X_ADMIN_TOKEN'];
        }
        $token = preg_replace('/^Bearer\s+/i', '', $authHeader);
        // Support both Sanctum id|secret and standalone tokens.
        $token = str_contains($token, '|') ? explode('|', $token, 2)[1] : $token;
        if ($token) {
            $hashedToken = hash('sha256', $token);
            $pdo->prepare("DELETE FROM personal_access_tokens WHERE token = ?")->execute([$hashedToken]);
        }
        echo json_encode(['message' => 'Logged out successfully.']);
        exit;
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}

<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Ensure feedbacks table exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS feedbacks (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL,
            message TEXT NOT NULL,
            chapter_id BIGINT UNSIGNED NULL,
            chapter_title VARCHAR(255) NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    // Public visitors may submit feedback; reading or changing it requires an admin token.
    if ($method !== 'POST') {
        require __DIR__ . '/admin_activity.php';
        $admin = requireAdmin($pdo, 'view_dashboard');
    }

    // POST: Public submission
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($body['name'] ?? '');
        $email = trim($body['email'] ?? '');
        $message = trim($body['message'] ?? '');
        $chapterId = !empty($body['chapter_id']) ? (int)$body['chapter_id'] : null;
        $chapterTitle = trim($body['chapter_title'] ?? '');

        if (!$name || !$email || !$message) {
            respond(['error' => true, 'message' => 'Name, Email, and Message are required.'], 422);
        }

        $stmt = $pdo->prepare("INSERT INTO feedbacks (name, email, message, chapter_id, chapter_title, is_read, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())");
        $stmt->execute([$name, $email, $message, $chapterId, $chapterTitle]);
        $newId = $pdo->lastInsertId();

        respond([
            'success' => true,
            'message' => 'Feedback submitted successfully.',
            'id' => $newId,
        ], 201);
    }

    // GET: List feedbacks (Admin)
    if ($method === 'GET') {
        $page  = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $total = (int)$pdo->query("SELECT COUNT(*) FROM feedbacks")->fetchColumn();
        $unread = (int)$pdo->query("SELECT COUNT(*) FROM feedbacks WHERE is_read = 0")->fetchColumn();

        $stmt = $pdo->prepare("SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        respond([
            'data' => $rows,
            'total' => $total,
            'unread' => $unread,
            'page' => $page,
            'limit' => $limit,
        ]);
    }

    // PUT: Mark as read / toggle read
    if ($method === 'PUT') {
        if (!$id) respond(['error' => true, 'message' => 'ID required'], 400);
        $stmt = $pdo->prepare("UPDATE feedbacks SET is_read = 1, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$id]);
        logAdminActivity($pdo, $admin, 'marked read', 'feedback', $id);
        respond(['success' => true]);
    }

    // DELETE: Delete feedback
    if ($method === 'DELETE') {
        if (!$id) respond(['error' => true, 'message' => 'ID required'], 400);
        $stmt = $pdo->prepare("DELETE FROM feedbacks WHERE id = ?");
        $stmt->execute([$id]);
        logAdminActivity($pdo, $admin, 'deleted', 'feedback', $id);
        respond(['success' => true]);
    }

    respond(['error' => true, 'message' => 'Method not allowed'], 405);

} catch (Throwable $e) {
    respond(['error' => true, 'message' => $e->getMessage()], 500);
}

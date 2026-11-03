<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

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

    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id && isset($_SERVER['REQUEST_URI'])) {
        if (preg_match('#/chapters/(\d+)#i', $_SERVER['REQUEST_URI'], $m)) {
            $id = (int)$m[1];
        }
    }

    if ($id) {
        // Fetch single chapter
        $stmt = $pdo->prepare("SELECT * FROM chapters WHERE id = ?");
        $stmt->execute([$id]);
        $chapter = $stmt->fetch();

        if (!$chapter) {
            http_response_code(404);
            echo json_encode(['error' => true, 'message' => 'Chapter not found']);
            exit;
        }

        // Fetch prev chapter
        $stmtPrev = $pdo->prepare("SELECT id, `order`, title, title_gu, title_en FROM chapters WHERE `order` < ? ORDER BY `order` DESC LIMIT 1");
        $stmtPrev->execute([$chapter['order']]);
        $prevChapter = $stmtPrev->fetch() ?: null;

        // Fetch next chapter
        $stmtNext = $pdo->prepare("SELECT id, `order`, title, title_gu, title_en FROM chapters WHERE `order` > ? ORDER BY `order` ASC LIMIT 1");
        $stmtNext->execute([$chapter['order']]);
        $nextChapter = $stmtNext->fetch() ?: null;

        echo json_encode([
            'chapter'      => $chapter,
            'prev_chapter' => $prevChapter,
            'next_chapter' => $nextChapter,
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    // Fetch all chapters list
    $stmt = $pdo->query("SELECT id, `order`, title, title_gu, title_en, description, description_gu, description_en FROM chapters ORDER BY `order` ASC");
    $chapters = $stmt->fetchAll();

    echo json_encode($chapters, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}

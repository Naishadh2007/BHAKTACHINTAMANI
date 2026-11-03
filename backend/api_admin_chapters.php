<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$isLocal = in_array(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0], ['localhost', '127.0.0.1', ''])
    || (php_sapi_name() === 'cli-server')
    || (isset($_SERVER['SERVER_ADDR']) && in_array($_SERVER['SERVER_ADDR'], ['127.0.0.1', '::1']));

if ($isLocal) {
    $host   = '127.0.0.1';
    $dbuser = 'root';
    $pass   = '';
    $db     = 'bhaktachintamani';
} else {
    $host   = 'sql107.infinityfree.com';
    $dbuser = 'if0_42640441';
    $pass   = 'Naishadhbv2007';
    $db     = 'if0_42640441_bhaktchintamani';
}

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $dbuser, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => true,
    ]);

    require __DIR__ . '/admin_activity.php';
    $method = $_SERVER['REQUEST_METHOD'];
    $admin = $method === 'GET' ? null : requireAdmin($pdo, 'manage_chapters');
    $id     = isset($_GET['id'])   ? intval($_GET['id'])   : null;
    if (!$id && isset($_SERVER['REQUEST_URI'])) {
        if (preg_match('#/chapters/(\d+)#i', $_SERVER['REQUEST_URI'], $m)) {
            $id = intval($m[1]);
        }
    }
    $bulk   = isset($_GET['bulk']);
    $input  = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) $input = [];

    // ── GET all ──────────────────────────────────────────────────────────────
    if ($method === 'GET' && !$id) {
        $page   = max(1, intval($_GET['page']  ?? 1));
        $limit  = max(1, intval($_GET['limit'] ?? 30));
        $offset = ($page - 1) * $limit;
        $search = !empty($_GET['search']) ? '%' . trim($_GET['search']) . '%' : null;

        $where  = '';
        $params = [];
        if ($search) {
            $where  = 'WHERE (title LIKE ? OR title_gu LIKE ? OR title_en LIKE ?)';
            $params = [$search, $search, $search];
        }

        $cnt = $pdo->prepare("SELECT COUNT(*) FROM chapters $where");
        $cnt->execute($params);
        $total = intval($cnt->fetchColumn());

        // Use string interpolation for LIMIT/OFFSET (safe because intval'd above)
        $sql = "SELECT * FROM chapters $where ORDER BY `order` ASC LIMIT $limit OFFSET $offset";
        $s = $pdo->prepare($sql);
        $s->execute($params);
        $rows = $s->fetchAll();

        // Add status fallback
        foreach ($rows as &$r) {
            if (!isset($r['status'])) $r['status'] = 'published';
        }
        unset($r);

        respond([
            'data'     => $rows,
            'total'    => $total,
            'page'     => $page,
            'limit'    => $limit,
            'has_more' => ($offset + $limit) < $total,
        ]);
    }

    // ── GET single ───────────────────────────────────────────────────────────
    if ($method === 'GET' && $id) {
        $s = $pdo->prepare("SELECT * FROM chapters WHERE id = ?");
        $s->execute([$id]);
        $ch = $s->fetch();
        if (!$ch) respond(['message' => 'Not found'], 404);
        if (!isset($ch['status'])) $ch['status'] = 'published';
        respond($ch);
    }

    // ── POST bulk ─────────────────────────────────────────────────────────────
    if ($method === 'POST' && $bulk) {
        $ids    = array_map('intval', (array)($input['ids'] ?? []));
        $action = trim($input['action'] ?? '');
        if (!$ids) respond(['message' => 'No IDs']);
        $ph = implode(',', $ids);
        if ($action === 'delete') {
            $pdo->exec("DELETE FROM chapters WHERE id IN ($ph)");
            logAdminActivity($pdo, $admin, 'deleted', count($ids) . ' chapters');
        }
        respond(['message' => 'Done']);
    }

    // ── POST create ───────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $maxOrder = intval($pdo->query("SELECT COALESCE(MAX(`order`),0) FROM chapters")->fetchColumn()) + 1;
        $ord   = intval($input['order'] ?? $maxOrder);
        $t     = $input['title']          ?? ($input['title_gu'] ?? '');
        $tgu   = $input['title_gu']       ?? '';
        $ten   = $input['title_en']       ?? '';
        $d     = $input['description']    ?? ($input['description_gu'] ?? '');
        $dgu   = $input['description_gu'] ?? '';
        $den   = $input['description_en'] ?? '';
        $c     = $input['content']        ?? ($input['content_gu'] ?? '');
        $cgu   = $input['content_gu']     ?? '';
        $cen   = $input['content_en']     ?? '';

        $pdo->prepare("INSERT INTO chapters (`order`,title,title_gu,title_en,description,description_gu,description_en,content,content_gu,content_en,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW(),NOW())")
            ->execute([$ord, $t, $tgu, $ten, $d, $dgu, $den, $c, $cgu, $cen]);

        $newId = $pdo->lastInsertId();
        logAdminActivity($pdo, $admin, 'created', 'chapter', (int)$newId);
        $s = $pdo->prepare("SELECT * FROM chapters WHERE id=?");
        $s->execute([$newId]);
        respond($s->fetch());
    }

    // ── PUT update ────────────────────────────────────────────────────────────
    if ($method === 'PUT' && $id) {
        $allowed = ['order','title','title_gu','title_en','description','description_gu','description_en','content','content_gu','content_en'];
        $sets = []; $vals = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $input)) {
                $sets[] = "`$f`=?";
                $vals[] = $input[$f];
            }
        }
        if (!$sets) respond(['message' => 'Nothing to update']);
        $vals[] = $id;
        $pdo->prepare("UPDATE chapters SET " . implode(',', $sets) . ",updated_at=NOW() WHERE id=?")->execute($vals);
        logAdminActivity($pdo, $admin, 'updated', 'chapter', $id);
        $s = $pdo->prepare("SELECT * FROM chapters WHERE id=?");
        $s->execute([$id]);
        respond($s->fetch());
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if ($method === 'DELETE' && $id) {
        $pdo->prepare("DELETE FROM chapters WHERE id=?")->execute([$id]);
        logAdminActivity($pdo, $admin, 'deleted', 'chapter', $id);
        respond(['message' => 'Deleted']);
    }

    respond(['message' => 'Unknown action'], 400);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => true, 'msg' => $e->getMessage(), 'line' => $e->getLine(), 'file' => basename($e->getFile())]);
}

<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

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
    $admin = requireAdmin($pdo, 'manage_users');

    $method = $_SERVER['REQUEST_METHOD'];
    $id     = isset($_GET['id']) ? intval($_GET['id']) : null;
    if (!$id && isset($_SERVER['REQUEST_URI'])) {
        if (preg_match('#/users/(\d+)#i', $_SERVER['REQUEST_URI'], $m)) {
            $id = intval($m[1]);
        }
    }
    $input  = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) $input = [];

    // ── GET all users ────────────────────────────────────────────────────────
    if ($method === 'GET' && !$id) {
        $rows = $pdo->query("SELECT id, name, email, is_super_admin, permissions, created_at FROM admins ORDER BY id ASC")->fetchAll();
        foreach ($rows as &$r) {
            $r['is_super_admin'] = (bool)$r['is_super_admin'];
            $r['permissions'] = json_decode($r['permissions'] ?? '{}', true) ?: [];
        }
        unset($r);
        respond($rows);
    }

    // ── GET single user ──────────────────────────────────────────────────────
    if ($method === 'GET' && $id) {
        $s = $pdo->prepare("SELECT id, name, email, is_super_admin, permissions, created_at FROM admins WHERE id = ?");
        $s->execute([$id]);
        $u = $s->fetch();
        if (!$u) respond(['message' => 'Not found'], 404);
        $u['is_super_admin'] = (bool)$u['is_super_admin'];
        $u['permissions'] = json_decode($u['permissions'] ?? '{}', true) ?: [];
        respond($u);
    }

    // ── POST create user ─────────────────────────────────────────────────────
    if ($method === 'POST') {
        $name  = trim($input['name']  ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        $pw    = $input['password'] ?? '';
        $perms = $input['permissions'] ?? [];

        if (!$name || !$email || !$pw) respond(['message' => 'Name, email, and password are required.'], 422);

        // Check duplicate
        $chk = $pdo->prepare("SELECT id FROM admins WHERE LOWER(email) = ?");
        $chk->execute([$email]);
        if ($chk->fetch()) respond(['message' => 'Email already exists.'], 422);

        $hash = password_hash($pw, PASSWORD_BCRYPT);
        $pdo->prepare("INSERT INTO admins (name, email, password, is_super_admin, permissions, created_at, updated_at) VALUES (?,?,?,0,?,NOW(),NOW())")
            ->execute([$name, $email, $hash, json_encode($perms)]);

        $newId = $pdo->lastInsertId();
        logAdminActivity($pdo, $admin, 'created', 'admin user', (int)$newId);
        $s = $pdo->prepare("SELECT id, name, email, is_super_admin, permissions, created_at FROM admins WHERE id = ?");
        $s->execute([$newId]);
        $u = $s->fetch();
        $u['is_super_admin'] = (bool)$u['is_super_admin'];
        $u['permissions'] = json_decode($u['permissions'] ?? '{}', true) ?: [];
        respond($u);
    }

    // ── PUT update user ──────────────────────────────────────────────────────
    if ($method === 'PUT' && $id) {
        $sets = []; $vals = [];
        if (!empty($input['name']))  { $sets[] = 'name=?';  $vals[] = trim($input['name']); }
        if (!empty($input['email'])) { $sets[] = 'email=?'; $vals[] = strtolower(trim($input['email'])); }
        if (!empty($input['password'])) { $sets[] = 'password=?'; $vals[] = password_hash($input['password'], PASSWORD_BCRYPT); }
        if (isset($input['permissions'])) { $sets[] = 'permissions=?'; $vals[] = json_encode($input['permissions']); }

        if (!$sets) respond(['message' => 'Nothing to update']);
        $vals[] = $id;
        $pdo->prepare("UPDATE admins SET " . implode(',', $sets) . ",updated_at=NOW() WHERE id=?")->execute($vals);
        logAdminActivity($pdo, $admin, 'updated', 'admin user', $id);

        $s = $pdo->prepare("SELECT id, name, email, is_super_admin, permissions, created_at FROM admins WHERE id = ?");
        $s->execute([$id]);
        $u = $s->fetch();
        $u['is_super_admin'] = (bool)$u['is_super_admin'];
        $u['permissions'] = json_decode($u['permissions'] ?? '{}', true) ?: [];
        respond($u);
    }

    // ── DELETE user ──────────────────────────────────────────────────────────
    if ($method === 'DELETE' && $id) {
        // Prevent deleting super admin
        $chk = $pdo->prepare("SELECT is_super_admin FROM admins WHERE id = ?");
        $chk->execute([$id]);
        $u = $chk->fetch();
        if ($u && $u['is_super_admin']) respond(['message' => 'Cannot delete super admin.'], 403);
        $pdo->prepare("DELETE FROM admins WHERE id=?")->execute([$id]);
        logAdminActivity($pdo, $admin, 'deleted', 'admin user', $id);
        respond(['message' => 'Deleted']);
    }

    respond(['message' => 'Unknown action'], 400);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => true, 'msg' => $e->getMessage(), 'line' => $e->getLine()]);
}

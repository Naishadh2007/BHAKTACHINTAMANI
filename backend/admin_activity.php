<?php

function currentAdmin(PDO $pdo): ?array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$header && !empty($_SERVER['HTTP_X_ADMIN_TOKEN'])) {
        $header = 'Bearer ' . $_SERVER['HTTP_X_ADMIN_TOKEN'];
    }
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $match)) return null;
    $token = str_contains($match[1], '|') ? explode('|', $match[1], 2)[1] : $match[1];
    $stmt = $pdo->prepare("SELECT a.id, a.name, a.email, a.is_super_admin, a.permissions, t.tokenable_type FROM personal_access_tokens t JOIN admins a ON a.id = t.tokenable_id WHERE t.token = ? AND (t.expires_at IS NULL OR t.expires_at > NOW()) LIMIT 1");
    $stmt->execute([hash('sha256', $token)]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    return $admin && str_replace('\\', '', $admin['tokenable_type']) === 'AppModelsAdmin' ? $admin : null;
}

function requireAdmin(PDO $pdo, string $permission): array {
    $admin = currentAdmin($pdo);
    $perms = $admin ? (json_decode($admin['permissions'] ?? '{}', true) ?: []) : [];
    if (!$admin || (!(bool)$admin['is_super_admin'] && empty($perms[$permission]))) {
        http_response_code($admin ? 403 : 401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['message' => $admin ? 'Forbidden' : 'Unauthenticated']);
        exit;
    }
    return $admin;
}

function logAdminActivity(PDO $pdo, array $admin, string $action, string $subject, ?int $subjectId = null): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS admin_activity (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, admin_id BIGINT UNSIGNED NOT NULL, admin_name VARCHAR(255) NOT NULL, action VARCHAR(32) NOT NULL, subject VARCHAR(100) NOT NULL, subject_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX (created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $stmt = $pdo->prepare('INSERT INTO admin_activity (admin_id, admin_name, action, subject, subject_id) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$admin['id'], $admin['name'], $action, $subject, $subjectId]);
}

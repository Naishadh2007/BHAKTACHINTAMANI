<?php
// Run: php -d extension=pdo_sqlite tests/auth_regression.php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'sqlite', 'database.connections.sqlite' => [
    'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '',
]]);
Illuminate\Support\Facades\DB::purge('sqlite');
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use App\Models\Admin;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Middleware\AdminAuth;
use Illuminate\Http\Request;
Schema::create('admins', function (Blueprint $t) {
    $t->id(); $t->string('name'); $t->string('email'); $t->string('password');
    $t->boolean('is_super_admin')->default(false); $t->text('permissions')->nullable();
});
Schema::create('personal_access_tokens', function (Blueprint $t) {
    $t->id(); $t->morphs('tokenable'); $t->string('name'); $t->string('token', 64)->unique();
    $t->text('abilities')->nullable(); $t->timestamp('expires_at')->nullable();
    $t->timestamp('last_used_at')->nullable(); $t->timestamps();
});
function check($condition, $message) { if (!$condition) throw new RuntimeException($message); echo "PASS: $message\n"; }
$admin = Admin::create(['name'=>'Test', 'email'=>'admin@example.test', 'password'=>' changed secret ', 'is_super_admin'=>true]);
$hash = $admin->password;
$controller = new AuthController;
$login = fn($password) => $controller->login(Request::create('/api/admin/login','POST', ['email'=>'ADMIN@EXAMPLE.TEST','password'=>$password]))->getData(true);
$first = $login(' changed secret ');
$second = $login(' changed secret ');
check($first['token'] !== $second['token'] && $admin->tokens()->count() === 2, 'Two logins preserve both sessions');
check($admin->fresh()->password === $hash, 'Login preserves changed password hash');
try { $login('wrong'); throw new RuntimeException('Wrong password accepted'); }
catch (Illuminate\Validation\ValidationException $e) { echo "PASS: Wrong password rejected\n"; }
$middleware = new AdminAuth;
$authenticated = function ($token, $next) use ($middleware) {
    $request = Request::create('/api/admin/me');
    $request->headers->set('Authorization', 'Bearer '.$token);
    return $middleware->handle($request, $next);
};
check($authenticated('admin_session_forged_token', fn()=>response()->json([]))->getStatusCode() === 401, 'Unstored session token rejected');
$authenticated($first['token'], fn($r)=>$controller->logout($r));
check($authenticated($first['token'], fn()=>response()->json([]))->getStatusCode() === 401, 'Logout invalidates current token');
check($authenticated($second['token'], fn()=>response()->json([]))->getStatusCode() === 200, 'Logout preserves other session');
$admin->tokens()->update(['expires_at'=>now()->subMinute()]);
check($authenticated($second['token'], fn()=>response()->json([]))->getStatusCode() === 401, 'Expired token rejected');
Schema::drop('personal_access_tokens');
try { $login(' changed secret '); throw new RuntimeException('Unstored token returned'); }
catch (Illuminate\Database\QueryException $e) { echo "PASS: Token storage failure cannot report successful login\n"; }

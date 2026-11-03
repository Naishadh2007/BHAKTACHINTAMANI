<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        // Try Sanctum token resolution
        try {
            $pat = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
            if ($pat && $pat->tokenable_type === Admin::class && (!$pat->expires_at || $pat->expires_at->isFuture())) {
                $admin = Admin::find($pat->tokenable_id);
                if ($admin) {
                    $admin->withAccessToken($pat);
                    $request->merge(['_admin' => $admin]);
                    $request->setUserResolver(fn() => $admin);
                    return $next($request);
                }
            }
        } catch (\Throwable $e) {
            // Ignore Sanctum error
        }

        return response()->json(['error' => 'Unauthenticated.'], 401);
    }
}

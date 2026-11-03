<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ChapterController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\AdminChapterController;
use App\Http\Controllers\Admin\UserController;

/*
|--------------------------------------------------------------------------
| Public API Routes
|--------------------------------------------------------------------------
*/
Route::get('/chapters', [ChapterController::class, 'index']);
Route::get('/chapters/{id}', [ChapterController::class, 'show']);

/*
|--------------------------------------------------------------------------
| Admin Auth Routes (no auth required)
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

/*
|--------------------------------------------------------------------------
| Admin Protected Routes (require admin token)
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->middleware(\App\Http\Middleware\AdminAuth::class)->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Chapters — manage_chapters permission required for write operations
    Route::get('/chapters',              [AdminChapterController::class, 'index']);
    Route::get('/chapters/{id}',         [AdminChapterController::class, 'show']);
    Route::post('/chapters',             [AdminChapterController::class, 'store'])
        ->middleware('permission:manage_chapters');
    Route::put('/chapters/{id}',         [AdminChapterController::class, 'update'])
        ->middleware('permission:manage_chapters');
    Route::delete('/chapters/{id}',      [AdminChapterController::class, 'destroy'])
        ->middleware('permission:delete_chapters');
    Route::post('/chapters/bulk',        [AdminChapterController::class, 'bulk'])
        ->middleware('permission:manage_chapters');

    // Users — manage_users permission required (super admin only by default)
    Route::get('/users',          [UserController::class, 'index'])
        ->middleware('permission:manage_users');
    Route::post('/users',         [UserController::class, 'store'])
        ->middleware('permission:manage_users');
    Route::put('/users/{id}',     [UserController::class, 'update'])
        ->middleware('permission:manage_users');
    // Feedbacks
    Route::get('/feedbacks',              [\App\Http\Controllers\FeedbackController::class, 'index']);
    Route::put('/feedbacks/{id}/read',    [\App\Http\Controllers\FeedbackController::class, 'markAsRead']);
    Route::delete('/feedbacks/{id}',      [\App\Http\Controllers\FeedbackController::class, 'destroy']);
});

Route::post('/feedback', [\App\Http\Controllers\FeedbackController::class, 'store']);

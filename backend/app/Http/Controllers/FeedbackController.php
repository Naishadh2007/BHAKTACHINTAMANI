<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class FeedbackController extends Controller
{
    /**
     * POST /api/feedback
     * Public endpoint to submit feedback.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:100',
            'email'         => 'required|email|max:150',
            'message'       => 'required|string|max:5000',
            'chapter_id'    => 'nullable|integer',
            'chapter_title' => 'nullable|string|max:255',
        ]);

        try {
            $feedback = Feedback::create($validated);
            return response()->json([
                'success'  => true,
                'message'  => 'Feedback received successfully.',
                'feedback' => $feedback,
            ], 201);
        } catch (Throwable $e) {
            return response()->json([
                'error'   => true,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/feedbacks
     * Admin endpoint to list feedbacks with pagination.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Feedback::query()->orderBy('created_at', 'desc');

            if ($request->has('chapter_id') && $request->chapter_id) {
                $query->where('chapter_id', $request->chapter_id);
            }

            $feedbacks = $query->paginate(20);
            return response()->json($feedbacks);
        } catch (Throwable $e) {
            return response()->json([
                'error'   => true,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/admin/feedbacks/{id}/read
     */
    public function markAsRead(int $id): JsonResponse
    {
        try {
            $fb = Feedback::findOrFail($id);
            $fb->update(['is_read' => true]);
            return response()->json(['success' => true, 'feedback' => $fb]);
        } catch (Throwable $e) {
            return response()->json(['error' => true, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /api/admin/feedbacks/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $fb = Feedback::findOrFail($id);
            $fb->delete();
            return response()->json(['success' => true, 'message' => 'Feedback deleted']);
        } catch (Throwable $e) {
            return response()->json(['error' => true, 'message' => $e->getMessage()], 500);
        }
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    protected $table = 'feedbacks';

    protected $fillable = [
        'name',
        'email',
        'message',
        'chapter_id',
        'chapter_title',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'chapter_id' => 'integer',
    ];
}

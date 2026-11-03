<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Admin extends Authenticatable
{
    use HasApiTokens, Notifiable;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'email',
        'password',
        'is_super_admin',
        'permissions',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_super_admin' => 'boolean',
        'permissions'    => 'array',
        'password'       => 'hashed',
    ];

    /**
     * Check if this admin has a specific permission.
     * Super admins always return true.
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->is_super_admin) {
            return true;
        }

        $perms = $this->permissions ?? [];
        return !empty($perms[$permission]);
    }

    /**
     * Return a safe array of permissions for the frontend.
     */
    public function permissionsArray(): array
    {
        if ($this->is_super_admin) {
            return [
                'manage_chapters'  => true,
                'delete_chapters'  => true,
                'publish_chapters' => true,
                'manage_users'     => true,
                'view_dashboard'   => true,
            ];
        }

        return array_merge([
            'manage_chapters'  => false,
            'delete_chapters'  => false,
            'publish_chapters' => false,
            'manage_users'     => false,
            'view_dashboard'   => false,
        ], $this->permissions ?? []);
    }
}

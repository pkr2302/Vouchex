<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'company_id',
        'email',
        'name',
        'role',
        'password',
        'is_active',
        'google_id',
        'auth_provider',
        'onboarding_step',
        'password_set',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'password_set' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function managedCompanies(): BelongsToMany
    {
        return $this->belongsToMany(Company::class, 'user_companies')->withTimestamps();
    }

    public function isTrialOwner(): bool
    {
        return $this->role === 'trial_owner';
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isGroupAdmin(): bool
    {
        return $this->role === 'group_admin';
    }

    /** Super admin or group admin — may switch between allowed companies. */
    public function canSwitchCompanies(): bool
    {
        return $this->isSuperAdmin() || $this->isGroupAdmin();
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['super_admin', 'admin', 'trial_owner', 'group_admin'], true);
    }

    public function isCompanyStaffAdmin(): bool
    {
        return in_array($this->role, ['admin', 'trial_owner', 'group_admin'], true);
    }

    /** @return list<int> */
    public function ownedCompanyIds(): array
    {
        if (! $this->isGroupAdmin()) {
            return [];
        }

        return Company::query()
            ->where('owner_user_id', $this->id)
            ->where('is_active', true)
            ->pluck('id')
            ->map(static fn ($id) => (int) $id)
            ->all();
    }

    /** @return list<int> */
    public function assignedCompanyIds(): array
    {
        if (! $this->isGroupAdmin() || ! Schema::hasTable('user_companies')) {
            return [];
        }

        return DB::table('user_companies')
            ->join('companies', 'companies.id', '=', 'user_companies.company_id')
            ->where('user_companies.user_id', $this->id)
            ->where('companies.is_active', true)
            ->pluck('companies.id')
            ->map(static fn ($id) => (int) $id)
            ->all();
    }

    public function accessibleCompanyIds(): array
    {
        if ($this->isSuperAdmin()) {
            return Company::query()
                ->where('is_active', true)
                ->pluck('id')
                ->map(static fn ($id) => (int) $id)
                ->all();
        }

        if (! $this->isGroupAdmin()) {
            return $this->company_id ? [(int) $this->company_id] : [];
        }

        return array_values(array_unique(array_merge($this->assignedCompanyIds(), $this->ownedCompanyIds())));
    }
}

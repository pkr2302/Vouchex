<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Company extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'is_active',
        'owner_user_id',
        'subscription_status',
        'subscription_plan',
        'trial_ends_at',
        'subscription_ends_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'trial_ends_at' => 'datetime',
            'subscription_ends_at' => 'datetime',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function settings(): HasOne
    {
        return $this->hasOne(CompanySetting::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    /** Companies visible in the portal header switcher for this user. */
    public static function portalListFor(User $user): array
    {
        $query = static::query()
            ->select('companies.id', 'companies.slug', 'companies.is_active', 'companies.owner_user_id')
            ->join('company_settings', 'company_settings.company_id', '=', 'companies.id')
            ->addSelect('company_settings.name as name')
            ->where('companies.is_active', true)
            ->orderBy('company_settings.name');

        if ($user->isSuperAdmin()) {
            $rows = $query->get();
        } else {
            $ids = $user->accessibleCompanyIds();
            if ($ids === []) {
                return [];
            }
            $rows = $query->whereIn('companies.id', $ids)->get();
        }

        return $rows->map(static fn ($company) => [
            'id' => (int) $company->id,
            'name' => (string) $company->name,
            'slug' => (string) $company->slug,
        ])->all();
    }
}

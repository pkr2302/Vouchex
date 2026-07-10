<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GlAccount extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'account_type',
        'account_group',
        'account_subtype',
        'ref_type',
        'ref_id',
        'is_system',
        'active',
        'opening_balance',
        'opening_balance_date',
        'normal_balance_side',
        'report_group_id',
        'description',
        'metadata',
    ];

    protected $casts = [
        'is_system' => 'boolean',
        'active' => 'boolean',
        'opening_balance' => 'decimal:2',
        'opening_balance_date' => 'date',
        'metadata' => 'array',
    ];

    public function journalLines(): HasMany
    {
        return $this->hasMany(GlJournalLine::class);
    }
}

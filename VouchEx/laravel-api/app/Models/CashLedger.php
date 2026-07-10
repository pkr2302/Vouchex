<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class CashLedger extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'name',
        'active',
        'account_code',
        'ledger_type',
        'account_subtype',
        'opening_balance',
        'opening_balance_date',
        'description',
        'location',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'opening_balance' => 'decimal:2',
            'opening_balance_date' => 'date',
        ];
    }
}

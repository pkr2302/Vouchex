<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class ExpenseHead extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'name',
        'account_code',
        'ledger_type',
        'account_subtype',
        'opening_balance',
        'opening_balance_date',
        'description',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'opening_balance_date' => 'date',
            'active' => 'boolean',
        ];
    }
}

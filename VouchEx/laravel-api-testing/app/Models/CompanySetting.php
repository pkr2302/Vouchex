<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'name',
        'trade_name',
        'gstin',
        'pan',
        'state',
        'address',
        'city',
        'pincode',
        'country',
        'email',
        'phone',
        'currency',
        'bank_name',
        'bank_account',
        'bank_account_holder',
        'bank_ifsc',
        'bank_branch',
        'upi_id',
        'logo',
        'is_financial_year_locked',
        'locked_months',
        'inactivity_timeout',
        'rcm_ledger_balance',
        'custom_options',
        'accounting_framework',
    ];

    protected function casts(): array
    {
        return [
            'is_financial_year_locked' => 'boolean',
            'locked_months' => 'array',
            'custom_options' => 'array',
            'rcm_ledger_balance' => 'decimal:2',
            'inactivity_timeout' => 'integer',
        ];
    }
}

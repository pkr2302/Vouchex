<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id', 'payment_number', 'expense_id', 'expense_number', 'payee',
        'payment_date', 'amount_paid', 'tds_deducted', 'currency', 'conversion_rate', 'payment_mode', 'paid_from',
        'reference_no', 'is_advance', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'amount_paid' => 'decimal:2',
            'tds_deducted' => 'decimal:2',
            'conversion_rate' => 'decimal:6',
            'is_advance' => 'boolean',
        ];
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }
}

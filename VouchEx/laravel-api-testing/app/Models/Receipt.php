<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Receipt extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id', 'receipt_number', 'invoice_id', 'invoice_number', 'customer_id',
        'customer_name', 'payment_date', 'amount_received', 'currency', 'conversion_rate',
        'tds_deducted', 'discount_allowed', 'payment_mode', 'deposit_to', 'reference_no',
        'advance_reference', 'utr_number', 'cheque_number', 'bank_reference', 'customer_reference',
        'is_advance', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'amount_received' => 'decimal:2',
            'tds_deducted' => 'decimal:2',
            'discount_allowed' => 'decimal:2',
            'conversion_rate' => 'decimal:6',
            'is_advance' => 'boolean',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdvanceAdjustment extends Model
{
    protected $fillable = [
        'company_id',
        'advance_receipt_id',
        'invoice_id',
        'adjustment_amount',
        'adjustment_date',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'adjustment_amount' => 'decimal:2',
            'adjustment_date' => 'date',
        ];
    }

    public function advanceReceipt(): BelongsTo
    {
        return $this->belongsTo(Receipt::class, 'advance_receipt_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}

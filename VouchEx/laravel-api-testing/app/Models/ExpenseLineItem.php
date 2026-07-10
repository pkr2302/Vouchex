<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpenseLineItem extends Model
{
    protected $fillable = [
        'expense_id', 'product_id', 'description', 'item_detail', 'quantity',
        'unit_price', 'line_total', 'hsn_sac', 'tax_rate_override',
        'supply_mechanism', 'cgst', 'sgst', 'igst',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'unit_price' => 'decimal:2',
            'line_total' => 'decimal:2',
            'tax_rate_override' => 'decimal:2',
            'cgst' => 'decimal:2',
            'sgst' => 'decimal:2',
            'igst' => 'decimal:2',
        ];
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }
}

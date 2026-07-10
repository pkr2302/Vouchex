<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DebitNoteItem extends Model
{
    protected $fillable = [
        'debit_note_id', 'product_id', 'description', 'item_detail', 'quantity',
        'original_qty', 'unit_price', 'original_rate', 'line_total', 'hsn_sac',
        'tax_rate_override', 'supply_mechanism', 'cgst', 'sgst', 'igst',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'original_qty' => 'decimal:3',
            'unit_price' => 'decimal:2',
            'original_rate' => 'decimal:2',
            'line_total' => 'decimal:2',
            'tax_rate_override' => 'decimal:2',
            'cgst' => 'decimal:2',
            'sgst' => 'decimal:2',
            'igst' => 'decimal:2',
        ];
    }

    public function debitNote(): BelongsTo
    {
        return $this->belongsTo(DebitNote::class);
    }
}

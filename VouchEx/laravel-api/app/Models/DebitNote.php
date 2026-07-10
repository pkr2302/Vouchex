<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DebitNote extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id', 'debit_note_number', 'vendor_id', 'vendor_name',
        'original_expense_id', 'original_expense_number', 'original_expense_date',
        'issue_date', 'reason', 'subtotal', 'tax_rate', 'tax_amount', 'total_amount',
        'cgst', 'sgst', 'igst', 'payable_tax', 'supply_mechanism',
        'currency', 'export_country', 'conversion_rate',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'original_expense_date' => 'date',
            'issue_date' => 'date',
            'subtotal' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'cgst' => 'decimal:2',
            'sgst' => 'decimal:2',
            'igst' => 'decimal:2',
            'payable_tax' => 'decimal:2',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DebitNoteItem::class);
    }
}

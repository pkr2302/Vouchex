<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CreditNote extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id', 'credit_note_number', 'customer_id', 'customer_name',
        'original_invoice_id', 'original_invoice_number', 'original_invoice_date',
        'issue_date', 'reason', 'subtotal', 'discount', 'tax_rate', 'tax_amount',
        'total_amount', 'cgst', 'sgst', 'igst', 'payable_tax', 'supply_mechanism',
        'currency', 'export_country', 'conversion_rate',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'original_invoice_date' => 'date',
            'issue_date' => 'date',
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'cgst' => 'decimal:2',
            'sgst' => 'decimal:2',
            'igst' => 'decimal:2',
            'payable_tax' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(CreditNoteItem::class);
    }
}

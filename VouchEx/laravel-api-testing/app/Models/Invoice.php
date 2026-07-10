<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id', 'invoice_number', 'invoice_type', 'customer_id', 'customer_name',
        'issue_date', 'due_date', 'po_number', 'billing_address', 'shipping_address',
        'place_of_supply', 'gstin', 'subtotal', 'discount', 'tax_rate', 'tax_amount',
        'cgst', 'sgst', 'igst', 'payable_tax', 'supply_mechanism', 'total_amount',
        'currency', 'export_country', 'export_treatment', 'conversion_rate',
        'print_place_of_supply_on_pdf',
        'status', 'created_by', 'created_by_name',
        'irn', 'ack_no', 'ack_date', 'einvoice_qr', 'einvoice_status',
        'einvoice_error', 'einvoice_generated_at', 'einvoice_cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'due_date' => 'date',
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'cgst' => 'decimal:2',
            'sgst' => 'decimal:2',
            'igst' => 'decimal:2',
            'payable_tax' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'print_place_of_supply_on_pdf' => 'boolean',
            'ack_date' => 'datetime',
            'einvoice_generated_at' => 'datetime',
            'einvoice_cancelled_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(Receipt::class);
    }
}

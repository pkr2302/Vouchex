<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Expense extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id', 'expense_number', 'invoice_number', 'description', 'expense_head',
        'vendor_id', 'vendor_name', 'expense_date', 'amount', 'tax_rate', 'tax_amount',
        'total_amount', 'cgst', 'sgst', 'igst', 'payable_tax', 'supply_mechanism',
        'place_of_supply', 'payment_status', 'hsn_sac', 'is_recurring',
        'recurring_frequency', 'reminders_opt_in', 'itc_eligible', 'tds_deducted',
        'attachment', 'due_date', 'paid_from_account', 'payment_reference',
        'product_id', 'quantity_purchased', 'created_by', 'record_type',
        'currency', 'export_country', 'conversion_rate',
    ];

    protected function casts(): array
    {
        return [
            'expense_date' => 'date',
            'due_date' => 'date',
            'amount' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'cgst' => 'decimal:2',
            'sgst' => 'decimal:2',
            'igst' => 'decimal:2',
            'payable_tax' => 'decimal:2',
            'tds_deducted' => 'decimal:2',
            'quantity_purchased' => 'decimal:3',
            'is_recurring' => 'boolean',
            'reminders_opt_in' => 'boolean',
            'itc_eligible' => 'boolean',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(ExpenseLineItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}

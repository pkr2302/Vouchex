<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id', 'name', 'contact_person', 'email', 'phone', 'category',
        'gst_type', 'gstin', 'pan', 'currency',
        'billing_address', 'billing_city', 'billing_state', 'billing_pincode', 'billing_country',
        'shipping_same', 'shipping_address', 'shipping_city', 'shipping_state',
        'shipping_pincode', 'shipping_country',
        'opening_balance', 'opening_balance_date', 'payment_terms', 'credit_limit',
    ];

    protected function casts(): array
    {
        return [
            'shipping_same' => 'boolean',
            'opening_balance' => 'decimal:2',
            'credit_limit' => 'decimal:2',
            'opening_balance_date' => 'date',
        ];
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}

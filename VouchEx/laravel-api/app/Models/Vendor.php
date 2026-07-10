<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vendor extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id', 'name', 'contact_person', 'email', 'phone',
        'category', 'gst_type', 'gstin', 'currency',
        'billing_address', 'billing_city', 'billing_state', 'billing_pincode', 'billing_country',
        'pan', 'opening_balance', 'opening_balance_date', 'payment_terms',
    ];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'opening_balance_date' => 'date',
        ];
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}

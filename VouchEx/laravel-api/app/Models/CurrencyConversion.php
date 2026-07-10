<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class CurrencyConversion extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'invoice_id',
        'invoice_number',
        'conversion_date',
        'from_currency',
        'to_currency',
        'from_amount',
        'from_book_amount_inr',
        'to_amount',
        'conversion_rate',
        'from_ledger',
        'to_ledger',
        'reference_no',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'conversion_date' => 'date',
            'from_amount' => 'decimal:2',
            'from_book_amount_inr' => 'decimal:2',
            'to_amount' => 'decimal:2',
            'conversion_rate' => 'decimal:6',
        ];
    }
}

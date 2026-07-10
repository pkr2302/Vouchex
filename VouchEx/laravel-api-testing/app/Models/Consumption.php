<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Consumption extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'consumption_number',
        'consumption_date',
        'product_id',
        'quantity',
        'unit_cost',
        'total_value',
        'expense_head',
        'reference',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'consumption_date' => 'date',
            'quantity' => 'decimal:3',
            'unit_cost' => 'decimal:2',
            'total_value' => 'decimal:2',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Inventory::class, 'product_id');
    }
}

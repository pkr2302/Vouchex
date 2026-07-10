<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    use BelongsToCompany;

    protected $table = 'inventories';

    protected $fillable = [
        'company_id', 'type', 'name', 'code', 'sku', 'quantity', 'unit',
        'rate', 'purchase_price', 'sales_price', 'tax_rate', 'supply_mechanism',
        'opening_stock', 'low_stock_threshold', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'opening_stock' => 'integer',
            'low_stock_threshold' => 'integer',
            'rate' => 'decimal:2',
            'purchase_price' => 'decimal:2',
            'sales_price' => 'decimal:2',
            'tax_rate' => 'decimal:2',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

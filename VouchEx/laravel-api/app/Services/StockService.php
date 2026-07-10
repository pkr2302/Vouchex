<?php

namespace App\Services;

use App\Models\Inventory;

class StockService
{
    public function adjust(int $productId, int $delta): void
    {
        $item = Inventory::find($productId);
        if (!$item || $item->type !== 'Product') {
            return;
        }
        $item->quantity = max(0, $item->quantity + $delta);
        $item->save();
    }
}

<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class EcrsLog extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id', 'action', 'type', 'cgst', 'sgst', 'igst', 'status', 'logged_at',
    ];

    protected function casts(): array
    {
        return [
            'cgst' => 'decimal:2',
            'sgst' => 'decimal:2',
            'igst' => 'decimal:2',
            'logged_at' => 'datetime',
        ];
    }
}

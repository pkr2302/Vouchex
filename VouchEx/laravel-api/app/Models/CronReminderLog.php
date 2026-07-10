<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class CronReminderLog extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id', 'expense_number', 'vendor_name', 'due_date', 'scheduled_date',
        'type', 'recipient', 'status', 'logged_at',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'scheduled_date' => 'date',
            'logged_at' => 'datetime',
        ];
    }
}

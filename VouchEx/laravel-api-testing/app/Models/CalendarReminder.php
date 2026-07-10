<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarReminder extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'user_id',
        'kind',
        'priority',
        'title',
        'notes',
        'reminder_date',
        'reminder_time',
        'notify_email',
        'is_recurring',
        'recurring_frequency',
        'email_status',
        'email_sent_at',
        'email_error',
        'popup_shown_at',
        'last_occurrence_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'reminder_date' => 'date',
            'email_sent_at' => 'datetime',
            'popup_shown_at' => 'datetime',
            'last_occurrence_sent_at' => 'datetime',
            'is_recurring' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

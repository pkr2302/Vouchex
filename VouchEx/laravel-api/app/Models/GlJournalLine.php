<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GlJournalLine extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'journal_id',
        'gl_account_id',
        'account_code',
        'account_name',
        'debit',
        'credit',
        'line_memo',
    ];

    protected $casts = [
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
    ];

    public function journal(): BelongsTo
    {
        return $this->belongsTo(GlJournal::class, 'journal_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(GlAccount::class, 'gl_account_id');
    }
}

<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GlJournal extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'journal_number',
        'journal_date',
        'source_type',
        'source_id',
        'reversal_of_journal_id',
        'is_reversal',
        'memo',
        'created_by',
    ];

    protected $casts = [
        'journal_date' => 'date',
        'is_reversal' => 'boolean',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(GlJournalLine::class, 'journal_id');
    }

    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversal_of_journal_id');
    }
}

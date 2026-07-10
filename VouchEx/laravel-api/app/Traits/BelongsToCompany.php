<?php

namespace App\Traits;

use App\Models\Company;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToCompany
{
    public static function bootBelongsToCompany(): void
    {
        static::creating(function ($model) {
            if (empty($model->company_id) && app()->bound('currentCompanyId')) {
                $model->company_id = app('currentCompanyId');
            }
        });

        static::addGlobalScope('company', function (Builder $builder) {
            if (app()->bound('currentCompanyId')) {
                $builder->where($builder->getModel()->getTable() . '.company_id', app('currentCompanyId'));
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}

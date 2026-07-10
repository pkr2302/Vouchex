<?php

namespace App\Support;

use Illuminate\Validation\Rule;

class TenantRules
{
    public static function uniquePerCompany(string $table, string $column): \Illuminate\Validation\Rules\Unique
    {
        $companyId = TenantContext::getCompanyId();

        return Rule::unique($table, $column)->where(
            fn ($query) => $query->where('company_id', $companyId)
        );
    }
}

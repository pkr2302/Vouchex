<?php

namespace App\Support;

use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\App;

class TenantContext
{
    public static function setCompany(?int $companyId): void
    {
        if ($companyId === null) {
            App::forgetInstance('currentCompanyId');
            return;
        }

        App::instance('currentCompanyId', $companyId);
    }

    public static function setFromUser(User $user): void
    {
        if ($user->isSuperAdmin()) {
            self::setCompany(null);
            return;
        }

        self::setCompany($user->company_id);
    }

    public static function getCompanyId(): ?int
    {
        return App::bound('currentCompanyId') ? App::make('currentCompanyId') : null;
    }

    public static function resolveCompanyForUser(User $user, ?int $requestedCompanyId = null): ?Company
    {
        if ($user->isSuperAdmin()) {
            if ($requestedCompanyId === null) {
                return null;
            }

            return Company::where('id', $requestedCompanyId)->where('is_active', true)->first();
        }

        return $user->company;
    }
}

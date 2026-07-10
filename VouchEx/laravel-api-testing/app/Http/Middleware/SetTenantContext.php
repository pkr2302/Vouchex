<?php

namespace App\Http\Middleware;

use App\Models\Company;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenantContext
{
    /** Routes that work without X-Company-Id (super admin company management). */
    private const NO_TENANT_PREFIXES = [
        'api/companies',
        'api/auth/me',
        'api/auth/logout',
        'api/auth/set-password',
        'api/onboarding',
        'api/subscription',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return $next($request);
        }

        if ($this->allowsWithoutTenant($request)) {
            return $next($request);
        }

        $requestedCompanyId = $request->header('X-Company-Id')
            ? (int) $request->header('X-Company-Id')
            : ($request->query('company_id') ? (int) $request->query('company_id') : null);

        if ($user->canSwitchCompanies()) {
            if (! $requestedCompanyId) {
                if ($user->isGroupAdmin() && $user->accessibleCompanyIds() === []) {
                    if ($request->is('api/portal/bootstrap')) {
                        return $next($request);
                    }
                }

                $cause = $user->isGroupAdmin()
                    ? 'Group admin must choose a company before loading or saving company data.'
                    : 'Super admin must choose a company before saving invoices, receipts, or other company data.';

                return response()->json([
                    'message' => 'No company selected.',
                    'type' => 'company_context',
                    'cause' => $cause,
                    'hint' => 'Use the company dropdown in the top header bar, then try again.',
                ], 422);
            }

            $companyQuery = Company::query()
                ->where('id', $requestedCompanyId)
                ->where('is_active', true);

            if ($user->isGroupAdmin()) {
                if (! in_array($requestedCompanyId, $user->accessibleCompanyIds(), true)) {
                    return response()->json([
                        'message' => 'Company not found or inactive.',
                        'type' => 'company_context',
                        'cause' => 'This company is not assigned to your group admin account.',
                        'hint' => 'Select a company from your assigned list or ask the portal super admin to grant access.',
                    ], 404);
                }
            }

            $company = $companyQuery->first();

            if (!$company) {
                return response()->json([
                    'message' => 'Company not found or inactive.',
                    'type' => 'company_context',
                    'cause' => 'The company ID sent in the request does not exist or is disabled.',
                    'hint' => 'Select a valid company from the dropdown and refresh the page.',
                ], 404);
            }

            TenantContext::setCompany($company->id);
        } else {
            if (!$user->company_id) {
                if ($user->isTrialOwner()) {
                    return $next($request);
                }

                return response()->json([
                    'message' => 'Your account is not linked to any company.',
                    'type' => 'company_context',
                    'cause' => 'This user record has no company_id in the database.',
                    'hint' => 'Ask the portal super admin to assign you to a company in Settings → User Management.',
                ], 403);
            }

            if ($requestedCompanyId && $requestedCompanyId !== (int) $user->company_id) {
                return response()->json([
                    'message' => 'You cannot access another company\'s data.',
                    'type' => 'company_context',
                    'cause' => 'The company selected in the header does not match your assigned company.',
                    'hint' => 'Switch to your assigned company or log in with the correct account.',
                ], 403);
            }

            TenantContext::setCompany((int) $user->company_id);
        }

        return $next($request);
    }

    private function allowsWithoutTenant(Request $request): bool
    {
        foreach (self::NO_TENANT_PREFIXES as $prefix) {
            if ($request->is($prefix) || $request->is($prefix.'/*')) {
                return true;
            }
        }

        return false;
    }
}

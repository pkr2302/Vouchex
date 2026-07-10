<?php

namespace App\Http\Middleware;

use App\Models\Company;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePortalAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || $user->isSuperAdmin()) {
            return $next($request);
        }

        // Trial/subscription gates apply only to self-serve trial signups — not legacy company admin or staff.
        if (! $user->isTrialOwner()) {
            return $next($request);
        }

        if ($user->onboarding_step !== 'complete') {
            return response()->json([
                'message' => 'Complete company onboarding before using the portal.',
                'type' => 'onboarding_required',
            ], 403);
        }

        $companyId = TenantContext::getCompanyId();
        if (! $companyId) {
            return $next($request);
        }

        $company = Company::find($companyId);
        if (! $company) {
            return response()->json(['message' => 'Company not found.'], 404);
        }

        $subscriptions = app(\App\Services\SubscriptionService::class);
        $company = $subscriptions->expireTrialIfNeeded($company);

        if (! $subscriptions->hasPortalAccess($company)) {
            return response()->json([
                'message' => 'Your free trial has ended. Please choose a subscription plan to continue.',
                'type' => 'subscription_required',
                'account' => $subscriptions->accountPayload($user, $company),
            ], 402);
        }

        return $next($request);
    }
}

<?php

namespace App\Services;

use App\Models\Company;
use App\Models\CompanySetting;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Mail\SubscriptionPaymentSubmittedMail;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class SubscriptionService
{
    public const PLANS = [
        'monthly' => ['label' => 'Monthly', 'amount' => 499, 'days' => 30],
        'quarterly' => ['label' => '3 Months', 'amount' => 1999, 'days' => 90],
        'yearly' => ['label' => 'Yearly', 'amount' => 4999, 'days' => 365],
    ];

    public const TRIAL_DAYS = 30;

    public function planCatalog(): array
    {
        return self::PLANS;
    }

    public function normalizeLegalName(string $name): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/', ' ', $name) ?? ''));
    }

    public function legalNameTaken(string $legalName, ?int $exceptCompanyId = null): bool
    {
        $norm = $this->normalizeLegalName($legalName);
        if ($norm === '') {
            return false;
        }

        $companyQuery = Company::query()->whereRaw('LOWER(TRIM(name)) = ?', [$norm]);
        if ($exceptCompanyId) {
            $companyQuery->where('id', '!=', $exceptCompanyId);
        }

        if ($companyQuery->exists()) {
            return true;
        }

        $settingsQuery = DB::table('company_settings')->whereRaw('LOWER(TRIM(name)) = ?', [$norm]);
        if ($exceptCompanyId) {
            $settingsQuery->where('company_id', '!=', $exceptCompanyId);
        }

        return $settingsQuery->exists();
    }

    public function assertLegalNameAvailable(string $legalName, ?int $exceptCompanyId = null): void
    {
        if ($this->legalNameTaken($legalName, $exceptCompanyId)) {
            throw new RuntimeException('A company with this legal name is already registered on VouchEx.');
        }
    }

    public function trialDaysRemaining(Company $company): ?int
    {
        if ($company->subscription_status !== 'trial' || ! $company->trial_ends_at) {
            return null;
        }

        return max(0, (int) now()->startOfDay()->diffInDays($company->trial_ends_at->startOfDay(), false));
    }

    public function hasPortalAccess(Company $company): bool
    {
        // Existing companies created before the subscription system (status none / empty).
        if (in_array($company->subscription_status, [null, '', 'none'], true)) {
            return true;
        }

        if ($company->subscription_status === 'active' && $company->subscription_ends_at && $company->subscription_ends_at->isFuture()) {
            return true;
        }

        if ($company->subscription_status === 'trial' && $company->trial_ends_at && $company->trial_ends_at->isFuture()) {
            return true;
        }

        return false;
    }

    public function canUploadLogo(User $user, Company $company): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->role === 'admin' && $company->subscription_status !== 'trial') {
            return $this->hasPortalAccess($company);
        }

        if ($user->isTrialOwner()) {
            return false;
        }

        return $user->role === 'admin' && $this->hasPortalAccess($company);
    }

    public function startTrial(Company $company): void
    {
        $company->update([
            'subscription_status' => 'trial',
            'trial_ends_at' => now()->addDays(self::TRIAL_DAYS),
            'subscription_plan' => null,
            'subscription_ends_at' => null,
        ]);
    }

    public function expireTrialIfNeeded(Company $company): Company
    {
        if (! in_array($company->subscription_status, ['trial', 'active'], true)) {
            return $company;
        }

        if ($company->subscription_status === 'trial' && $company->trial_ends_at && $company->trial_ends_at->isPast()) {
            $company->update(['subscription_status' => 'expired']);
            $company->refresh();
        }

        if ($company->subscription_status === 'active' && $company->subscription_ends_at && $company->subscription_ends_at->isPast()) {
            $company->update(['subscription_status' => 'expired']);
            $company->refresh();
        }

        return $company;
    }

    public function submitPaymentClaim(User $user, Company $company, string $plan, string $reference, ?string $notes): SubscriptionPayment
    {
        if (! isset(self::PLANS[$plan])) {
            throw new RuntimeException('Invalid subscription plan.');
        }

        $planRow = self::PLANS[$plan];

        $payment = SubscriptionPayment::create([
            'company_id' => $company->id,
            'user_id' => $user->id,
            'plan' => $plan,
            'amount' => $planRow['amount'],
            'payment_reference' => $reference,
            'status' => 'pending',
            'notes' => $notes,
        ]);

        $this->notifyAdminsOfPaymentSubmission($payment, $user, $company, $planRow);

        return $payment;
    }

    private function notifyAdminsOfPaymentSubmission(
        SubscriptionPayment $payment,
        User $user,
        Company $company,
        array $planRow
    ): void {
        $recipients = config('services.vouchex.subscription_notify_emails', []);
        if ($recipients === []) {
            return;
        }

        $settings = CompanySetting::where('company_id', $company->id)->first();

        try {
            Mail::to($recipients)->send(new SubscriptionPaymentSubmittedMail(
                $payment,
                $user,
                $company,
                $settings,
                $planRow,
            ));
        } catch (\Throwable $e) {
            Log::error('Subscription payment notification email failed', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function approvePayment(SubscriptionPayment $payment, User $reviewer): void
    {
        if ($payment->status !== 'pending') {
            throw new RuntimeException('Payment claim already processed.');
        }

        $plan = self::PLANS[$payment->plan] ?? null;
        if (! $plan) {
            throw new RuntimeException('Invalid plan on payment record.');
        }

        DB::transaction(function () use ($payment, $reviewer, $plan) {
            $company = Company::findOrFail($payment->company_id);
            $ends = Carbon::now()->addDays($plan['days']);

            if ($company->subscription_status === 'active' && $company->subscription_ends_at && $company->subscription_ends_at->isFuture()) {
                $ends = $company->subscription_ends_at->copy()->addDays($plan['days']);
            }

            $company->update([
                'subscription_status' => 'active',
                'subscription_plan' => $payment->plan,
                'subscription_ends_at' => $ends,
            ]);

            $payment->update([
                'status' => 'approved',
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ]);

            SubscriptionPayment::where('company_id', $company->id)
                ->where('id', '!=', $payment->id)
                ->where('status', 'pending')
                ->update(['status' => 'superseded']);
        });
    }

    public function rejectPayment(SubscriptionPayment $payment, User $reviewer, ?string $notes = null): void
    {
        if ($payment->status !== 'pending') {
            throw new RuntimeException('Payment claim already processed.');
        }

        $payment->update([
            'status' => 'rejected',
            'notes' => trim(($payment->notes ?? '').' '.($notes ?? '')),
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
        ]);
    }

    public function accountPayload(User $user, ?Company $company): array
    {
        $step = $user->onboarding_step;
        $subscription = null;
        $trialDays = null;
        $access = true;

        if ($company) {
            $company = $this->expireTrialIfNeeded($company);
            $trialDays = $this->trialDaysRemaining($company);
            $access = $this->hasPortalAccess($company);
            $subscription = [
                'status' => $company->subscription_status,
                'plan' => $company->subscription_plan,
                'trial_ends_at' => $company->trial_ends_at?->toIso8601String(),
                'subscription_ends_at' => $company->subscription_ends_at?->toIso8601String(),
                'trial_days_remaining' => $trialDays,
                'has_access' => $access,
                'can_upload_logo' => $this->canUploadLogo($user, $company),
            ];
        } elseif ($user->isTrialOwner()) {
            $access = false;
            $step = $step ?: 'company_create';
        }

        return [
            'onboarding_step' => $step,
            'subscription' => $subscription,
            'has_portal_access' => $access,
            'needs_subscription' => $user->isTrialOwner() && $company && ! $access && ($step === 'complete'),
        ];
    }
}

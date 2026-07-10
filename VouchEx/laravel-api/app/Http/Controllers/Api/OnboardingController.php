<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanySetting;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class OnboardingController extends Controller
{
    public function __construct(private SubscriptionService $subscriptions) {}

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $company = $user->company_id ? Company::find($user->company_id) : null;

        return response()->json([
            'success' => true,
            'account' => $this->subscriptions->accountPayload($user, $company),
        ]);
    }

    public function createCompany(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->isTrialOwner()) {
            return response()->json(['message' => 'Only trial registrations use this onboarding step.'], 403);
        }
        if ($user->company_id) {
            return response()->json(['message' => 'Your account is already linked to a company.'], 422);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'trade_name' => 'nullable|string|max:255',
            'gstin' => 'nullable|string|max:15',
            'state' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
        ]);

        try {
            $this->subscriptions->assertLegalNameAvailable($data['name']);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $company = DB::transaction(function () use ($data, $user) {
            $baseSlug = Str::slug($data['name']);
            $slug = $baseSlug;
            $suffix = 1;
            while (Company::where('slug', $slug)->exists()) {
                $slug = $baseSlug.'-'.$suffix;
                $suffix++;
            }

            $company = Company::create([
                'name' => trim($data['name']),
                'slug' => $slug,
                'is_active' => true,
                'owner_user_id' => $user->id,
                'subscription_status' => 'none',
            ]);

            CompanySetting::create([
                'company_id' => $company->id,
                'name' => trim($data['name']),
                'trade_name' => trim($data['trade_name'] ?? $data['name']),
                'gstin' => $data['gstin'] ?? null,
                'state' => $data['state'] ?? 'Gujarat',
                'email' => $data['email'] ?? $user->email,
                'country' => 'India',
                'currency' => 'INR',
                'inactivity_timeout' => 900,
                'rcm_ledger_balance' => 0,
                'custom_options' => [],
            ]);

            $user->update([
                'company_id' => $company->id,
                'onboarding_step' => 'company_details',
            ]);

            return $company;
        });

        return response()->json([
            'success' => true,
            'company' => ['id' => $company->id, 'name' => $company->name],
            'account' => $this->subscriptions->accountPayload($user->fresh(), $company),
        ], 201);
    }

    public function saveCompanyDetails(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->isTrialOwner() || ! $user->company_id) {
            return response()->json(['message' => 'Invalid onboarding state.'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'trade_name' => 'nullable|string|max:255',
            'gstin' => 'nullable|string|max:20',
            'pan' => 'nullable|string|max:20',
            'state' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
            'email' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'currency' => 'nullable|string|max:30',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:50',
            'bank_account_holder' => 'nullable|string|max:255',
            'bank_ifsc' => 'nullable|string|max:20',
            'bank_branch' => 'nullable|string|max:255',
        ]);

        $company = Company::findOrFail($user->company_id);

        try {
            $this->subscriptions->assertLegalNameAvailable($data['name'], $company->id);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        DB::transaction(function () use ($data, $user, $company) {
            $company->update(['name' => trim($data['name'])]);
            $settings = CompanySetting::where('company_id', $company->id)->firstOrFail();
            $settings->fill($data);
            $settings->name = trim($data['name']);
            $settings->trade_name = trim($data['trade_name'] ?? $data['name']);
            $settings->save();

            $this->subscriptions->startTrial($company->fresh());
            $user->update(['onboarding_step' => 'complete']);
        });

        $company = $company->fresh();

        return response()->json([
            'success' => true,
            'account' => $this->subscriptions->accountPayload($user->fresh(), $company),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanySetting;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class CompanyController extends Controller
{
    public function __construct(private SubscriptionService $subscriptions) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'companies' => Company::portalListFor($request->user()),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (! $actor->isSuperAdmin() && ! $actor->isGroupAdmin()) {
            return response()->json(['message' => 'Only the portal super admin can create companies.'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'trade_name' => 'nullable|string|max:255',
            'gstin' => 'nullable|string|max:15',
            'state' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'integer|exists:users,id',
            'user_roles' => 'nullable|array',
            'user_roles.*' => 'in:admin,user',
        ]);

        try {
            $this->subscriptions->assertLegalNameAvailable($data['name']);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $baseSlug = Str::slug($data['name']);
        $slug = $baseSlug;
        $suffix = 1;
        while (Company::where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$suffix;
            $suffix++;
        }

        $company = Company::create([
            'name' => $data['name'],
            'slug' => $slug,
            'is_active' => true,
            'owner_user_id' => $actor->isGroupAdmin() ? $actor->id : null,
        ]);

        CompanySetting::create([
            'company_id' => $company->id,
            'name' => $data['name'],
            'trade_name' => trim($data['trade_name'] ?? $data['name']),
            'gstin' => $data['gstin'] ?? null,
            'state' => $data['state'] ?? 'Gujarat',
            'email' => $data['email'] ?? null,
            'country' => 'India',
            'currency' => 'INR',
            'inactivity_timeout' => 900,
            'rcm_ledger_balance' => 0,
            'custom_options' => [],
        ]);

        if ($actor->isGroupAdmin()) {
            $actor->managedCompanies()->syncWithoutDetaching([$company->id]);
        }

        $userIds = array_values(array_unique(array_map('intval', $data['user_ids'] ?? [])));
        $userRoles = $data['user_roles'] ?? [];
        $hasRoleCol = Schema::hasColumn('user_companies', 'role');
        foreach ($userIds as $userId) {
            if ((int) $userId === (int) $actor->id) {
                continue;
            }
            $assignee = User::query()
                ->where('id', $userId)
                ->whereNotIn('role', ['super_admin'])
                ->first();
            if (! $assignee) {
                continue;
            }
            if ($actor->isGroupAdmin()) {
                $overlap = array_intersect($assignee->accessibleCompanyIds(), $actor->accessibleCompanyIds());
                if ($overlap === [] && (int) $assignee->company_id && ! in_array((int) $assignee->company_id, $actor->accessibleCompanyIds(), true)) {
                    // Allow assigning known portal users when actor is group admin of new company; still require assignee is not another group's unrelated staff if primary company outside.
                    // Soft rule: skip users the actor cannot see via portal list — handled below for super only openness.
                }
            }
            if (! $actor->isSuperAdmin()) {
                // Group admins may only attach users already in their managed companies (or themselves skipped above).
                $visible = array_intersect($assignee->accessibleCompanyIds(), $actor->accessibleCompanyIds());
                if ($visible === [] && ! in_array((int) $assignee->company_id, $actor->accessibleCompanyIds(), true)) {
                    continue;
                }
            }
            if ($assignee->isGroupAdmin()) {
                $assignee->managedCompanies()->syncWithoutDetaching([$company->id]);
                continue;
            }
            $role = $userRoles[(string) $userId] ?? $userRoles[$userId] ?? ($assignee->role === 'admin' ? 'admin' : 'user');
            if (! in_array($role, ['admin', 'user'], true)) {
                $role = 'user';
            }
            if ($hasRoleCol) {
                $assignee->managedCompanies()->syncWithoutDetaching([
                    $company->id => ['role' => $role],
                ]);
            } else {
                $assignee->managedCompanies()->syncWithoutDetaching([$company->id]);
            }
            if (! $assignee->company_id) {
                $assignee->company_id = $company->id;
                $assignee->save();
            }
        }

        return response()->json([
            'success' => true,
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
            ],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $company = Company::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $company->update($data);

        if (isset($data['name'])) {
            CompanySetting::where('company_id', $company->id)->update(['name' => $data['name']]);
        }

        return response()->json(['success' => true, 'company' => $company]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Only the portal super admin can delete companies.'], 403);
        }

        $company = Company::findOrFail($id);

        $activeCount = Company::query()->where('is_active', true)->count();
        if ($activeCount <= 1) {
            return response()->json(['message' => 'Cannot delete the only remaining company.'], 422);
        }

        User::query()
            ->where('company_id', $company->id)
            ->where('role', '!=', 'super_admin')
            ->delete();

        $company->delete();

        return response()->json(['success' => true]);
    }
}

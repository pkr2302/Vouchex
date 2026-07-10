<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GlAccount;
use App\Models\ReportGroup;
use App\Services\CoaService;
use App\Services\CoaAutoMapService;
use App\Services\ReportGroupService;
use App\Support\CoaCatalog;
use App\Support\TenantRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoaController extends Controller
{
    public function __construct(
        private CoaService $coa,
        private ReportGroupService $reportGroups,
    ) {}

    public function subtypes(): JsonResponse
    {
        return response()->json(['subtypes' => CoaCatalog::allSubtypes()]);
    }

    public function chart(): JsonResponse
    {
        $companyId = (int) \App\Support\TenantContext::getCompanyId();

        return response()->json([
            'chart' => $this->coa->buildChart($companyId),
        ]);
    }

    public function storeAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:64', TenantRules::uniquePerCompany('gl_accounts', 'code')],
            'name' => 'required|string|max:255',
            'account_subtype' => 'required|string|max:64',
            'normal_balance_side' => 'nullable|in:debit,credit',
            'opening_balance' => 'nullable|numeric',
            'opening_balance_date' => 'nullable|date',
            'description' => 'nullable|string',
            'metadata' => 'nullable|array',
            'report_group_id' => 'nullable|integer|exists:report_groups,id',
            'active' => 'nullable|boolean',
        ]);

        $account = $this->coa->createAccount($data, (int) $request->user()->id);

        return response()->json([
            'success' => true,
            'account' => $this->coa->mapAccount($account),
        ], 201);
    }

    public function updateAccount(Request $request, int $id): JsonResponse
    {
        $account = GlAccount::findOrFail($id);
        $reportGroupOnly = $request->boolean('report_group_id_only');

        if ($reportGroupOnly) {
            $data = $request->validate([
                'report_group_id' => 'nullable|integer|exists:report_groups,id',
                'report_group_id_only' => 'required|boolean',
            ]);
        } else {
            $data = $request->validate([
                'code' => ['sometimes', 'string', 'max:64', TenantRules::uniquePerCompany('gl_accounts', 'code')->ignore($id)],
                'name' => 'sometimes|string|max:255',
                'account_subtype' => 'sometimes|string|max:64',
                'normal_balance_side' => 'nullable|in:debit,credit',
                'opening_balance' => 'nullable|numeric',
                'opening_balance_date' => 'nullable|date',
                'description' => 'nullable|string',
                'metadata' => 'nullable|array',
                'report_group_id' => 'nullable|integer|exists:report_groups,id',
                'active' => 'nullable|boolean',
            ]);
        }

        $account = $this->coa->updateAccount($account, $data + ['report_group_id_only' => $reportGroupOnly], (int) $request->user()->id);

        return response()->json([
            'success' => true,
            'account' => $this->coa->mapAccount($account),
        ]);
    }

    public function deleteAccount(Request $request, int $id): JsonResponse
    {
        $account = GlAccount::findOrFail($id);
        $this->coa->deleteAccount($account);

        return response()->json(['success' => true]);
    }

    public function reportGroups(): JsonResponse
    {
        $companyId = (int) \App\Support\TenantContext::getCompanyId();

        return response()->json(['report_groups' => $this->reportGroups->tree($companyId)]);
    }

    public function storeReportGroup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|integer|exists:report_groups,id',
            'code' => 'nullable|string|max:64',
            'statement_type' => 'nullable|in:balance_sheet,profit_loss,trial_balance,notes',
            'nature' => 'nullable|string|max:32',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $group = $this->reportGroups->createGroup($data);

        return response()->json(['success' => true, 'group' => $group], 201);
    }

    public function updateReportGroup(Request $request, int $id): JsonResponse
    {
        $group = ReportGroup::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'parent_id' => 'nullable|integer|exists:report_groups,id',
            'code' => 'nullable|string|max:64',
            'statement_type' => 'nullable|in:balance_sheet,profit_loss,trial_balance,notes',
            'nature' => 'nullable|string|max:32',
            'sort_order' => 'nullable|integer|min:0',
            'active' => 'nullable|boolean',
        ]);

        $group = $this->reportGroups->updateGroup($group, $data);

        return response()->json(['success' => true, 'group' => $group]);
    }

    public function deleteReportGroup(Request $request, int $id): JsonResponse
    {
        $group = ReportGroup::findOrFail($id);
        $this->reportGroups->deleteGroup($group);

        return response()->json(['success' => true]);
    }

    public function loadReportGroupTemplate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'template' => 'required|in:schedule_iii_as,schedule_iii_ind_as',
        ]);
        $companyId = (int) \App\Support\TenantContext::getCompanyId();
        $count = $this->reportGroups->loadTemplate($companyId, $data['template']);

        return response()->json([
            'success' => true,
            'created' => $count,
            'report_groups' => $this->reportGroups->tree($companyId),
        ]);
    }

    public function assignReportGroups(Request $request): JsonResponse
    {
        $data = $request->validate([
            'assignments' => 'required|array|min:1',
            'assignments.*.gl_account_id' => 'required|integer|exists:gl_accounts,id',
            'assignments.*.report_group_id' => 'nullable|integer|exists:report_groups,id',
        ]);

        $count = $this->reportGroups->bulkAssign($data['assignments']);

        return response()->json(['success' => true, 'updated' => $count]);
    }

    public function autoMapReportGroups(Request $request): JsonResponse
    {
        $result = app(CoaAutoMapService::class)->autoMap((int) \App\Support\TenantContext::getCompanyId());

        return response()->json([
            'success' => true,
            'auto_map' => $result,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GlBackfillService;
use App\Services\GlGroupedReportingService;
use App\Services\GlNotesReportingService;
use App\Services\GlOperationalReportingService;
use App\Services\GlReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlFinancialController extends Controller
{
    public function __construct(
        private GlReportingService $reports,
        private GlGroupedReportingService $groupedReports,
        private GlOperationalReportingService $operational,
        private GlNotesReportingService $notesReports,
        private GlBackfillService $backfill,
    ) {}

    public function trialBalance(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'grouped' => 'nullable|in:0,1,true,false',
            'detail' => 'nullable|in:condensed,detailed',
        ]);

        $grouped = $this->wantsGrouped($request);
        $detail = $data['detail'] ?? 'condensed';

        if ($grouped) {
            return response()->json([
                'success' => true,
                'trial_balance' => [
                    ...$this->groupedReports->groupedTrialBalance($data['from'] ?? null, $data['to'] ?? null, $detail),
                    'view_mode' => 'grouped',
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'trial_balance' => [
                ...$this->reports->trialBalance($data['from'] ?? null, $data['to'] ?? null),
                'view_mode' => 'ledger',
            ],
        ]);
    }

    public function profitAndLoss(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'grouped' => 'nullable|in:0,1,true,false',
            'detail' => 'nullable|in:condensed,detailed',
        ]);

        $grouped = $this->wantsGrouped($request);
        $detail = $data['detail'] ?? 'condensed';

        if ($grouped) {
            return response()->json([
                'success' => true,
                'profit_and_loss' => [
                    ...$this->groupedReports->groupedProfitAndLoss($data['from'] ?? null, $data['to'] ?? null, $detail),
                    'view_mode' => 'grouped',
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'profit_and_loss' => [
                ...$this->reports->profitAndLoss($data['from'] ?? null, $data['to'] ?? null),
                'view_mode' => 'ledger',
            ],
        ]);
    }

    public function balanceSheet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'as_of' => 'nullable|date',
            'grouped' => 'nullable|in:0,1,true,false',
            'detail' => 'nullable|in:condensed,detailed',
        ]);

        $grouped = $this->wantsGrouped($request);
        $detail = $data['detail'] ?? 'condensed';

        if ($grouped) {
            return response()->json([
                'success' => true,
                'balance_sheet' => [
                    ...$this->groupedReports->groupedBalanceSheet($data['as_of'] ?? null, $detail),
                    'view_mode' => 'grouped',
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'balance_sheet' => [
                ...$this->reports->balanceSheet($data['as_of'] ?? null),
                'view_mode' => 'ledger',
            ],
        ]);
    }

    private function wantsGrouped(Request $request): bool
    {
        if (! $request->has('grouped')) {
            return false;
        }

        $value = $request->query('grouped', $request->input('grouped'));

        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (int) $value === 1;
        }

        return in_array(strtolower((string) $value), ['1', 'true', 'on', 'yes'], true);
    }

    public function backfill(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $counts = $this->backfill->backfillCompany(
            (int) app('currentCompanyId'),
            $user->id
        );

        return response()->json([
            'success' => true,
            'backfill' => $counts,
            'has_errors' => ($counts['summary']['failed'] ?? count($counts['errors'] ?? [])) > 0,
        ]);
    }

    public function operationalReports(Request $request): JsonResponse
    {
        $data = $request->validate([
            'as_of' => 'nullable|date',
        ]);
        $asOf = $data['as_of'] ?? null;

        return response()->json([
            'success' => true,
            'receivables_ageing' => $this->operational->receivablesAgeing($asOf),
            'payables_ageing' => $this->operational->payablesAgeing($asOf),
            'cash_bank_summary' => $this->operational->cashBankSummary($asOf),
        ]);
    }

    public function ledgerStatement(Request $request): JsonResponse
    {
        $data = $request->validate([
            'gl_account_id' => 'required|integer',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        return response()->json([
            'success' => true,
            'ledger_statement' => $this->operational->ledgerStatement(
                (int) $data['gl_account_id'],
                $data['from'] ?? null,
                $data['to'] ?? null
            ),
        ]);
    }

    public function notesToAccounts(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'as_of' => 'nullable|date',
        ]);

        return response()->json([
            'success' => true,
            'notes_to_accounts' => $this->notesReports->notesToAccounts(
                $data['from'] ?? null,
                $data['to'] ?? null,
                $data['as_of'] ?? null,
            ),
        ]);
    }
}

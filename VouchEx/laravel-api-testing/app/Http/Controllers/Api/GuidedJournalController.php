<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GuidedJournalService;
use App\Services\GlRegistersReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class GuidedJournalController extends Controller
{
    public function __construct(
        private GuidedJournalService $guided,
        private GlRegistersReportingService $registers,
    ) {}

    public function recent(Request $request): JsonResponse
    {
        $data = $request->validate([
            'limit' => 'nullable|integer|min:1|max:100',
        ]);

        return response()->json([
            'success' => true,
            'journals' => $this->registers->recentGuidedJournals((int) ($data['limit'] ?? 50)),
        ]);
    }

    public function manualJournal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'memo' => 'nullable|string|max:500',
            'lines' => 'required|array|min:2',
            'lines.*.gl_account_id' => 'required|integer',
            'lines.*.debit' => 'nullable|numeric|min:0',
            'lines.*.credit' => 'nullable|numeric|min:0',
            'lines.*.memo' => 'nullable|string|max:255',
        ]);

        return $this->respondJournal(
            fn () => $this->guided->postManualJournal(
                $data['date'],
                $data['lines'],
                $data['memo'] ?? null,
                $request->user()->id
            )
        );
    }

    public function bankCashTransfer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'from_account_id' => 'required|integer',
            'to_account_id' => 'required|integer|different:from_account_id',
            'amount' => 'required|numeric|min:0.01',
            'memo' => 'nullable|string|max:500',
        ]);

        return $this->respondJournal(
            fn () => $this->guided->postBankCashTransfer(
                $data['date'],
                (int) $data['from_account_id'],
                (int) $data['to_account_id'],
                (float) $data['amount'],
                $data['memo'] ?? null,
                $request->user()->id
            )
        );
    }

    public function capitalIntroduction(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'bank_account_id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01',
            'memo' => 'nullable|string|max:500',
        ]);

        return $this->respondJournal(
            fn () => $this->guided->postCapitalIntroduction(
                $data['date'],
                (int) $data['bank_account_id'],
                (float) $data['amount'],
                $data['memo'] ?? null,
                $request->user()->id
            )
        );
    }

    public function ownerWithdrawal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'bank_account_id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01',
            'memo' => 'nullable|string|max:500',
        ]);

        return $this->respondJournal(
            fn () => $this->guided->postOwnerWithdrawal(
                $data['date'],
                (int) $data['bank_account_id'],
                (float) $data['amount'],
                $data['memo'] ?? null,
                $request->user()->id
            )
        );
    }

    public function loanReceived(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'bank_account_id' => 'required|integer',
            'loan_account_id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01',
            'memo' => 'nullable|string|max:500',
        ]);

        return $this->respondJournal(
            fn () => $this->guided->postLoanReceived(
                $data['date'],
                (int) $data['bank_account_id'],
                (int) $data['loan_account_id'],
                (float) $data['amount'],
                $data['memo'] ?? null,
                $request->user()->id
            )
        );
    }

    public function loanRepayment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'bank_account_id' => 'required|integer',
            'loan_account_id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01',
            'memo' => 'nullable|string|max:500',
        ]);

        return $this->respondJournal(
            fn () => $this->guided->postLoanRepayment(
                $data['date'],
                (int) $data['bank_account_id'],
                (int) $data['loan_account_id'],
                (float) $data['amount'],
                $data['memo'] ?? null,
                $request->user()->id
            )
        );
    }

    public function depreciation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'expense_account_id' => 'required|integer',
            'asset_account_id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01',
            'memo' => 'nullable|string|max:500',
        ]);

        return $this->respondJournal(
            fn () => $this->guided->postDepreciation(
                $data['date'],
                (int) $data['expense_account_id'],
                (int) $data['asset_account_id'],
                (float) $data['amount'],
                $data['memo'] ?? null,
                $request->user()->id
            )
        );
    }

    public function statutoryPayment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'bank_account_id' => 'required|integer',
            'statutory_account_id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01',
            'memo' => 'nullable|string|max:500',
        ]);

        return $this->respondJournal(
            fn () => $this->guided->postStatutoryPayment(
                $data['date'],
                (int) $data['bank_account_id'],
                (int) $data['statutory_account_id'],
                (float) $data['amount'],
                $data['memo'] ?? null,
                $request->user()->id
            )
        );
    }

    private function respondJournal(callable $callback): JsonResponse
    {
        try {
            $journal = $callback();

            return response()->json([
                'success' => true,
                'journal' => [
                    'id' => $journal->id,
                    'journal_number' => $journal->journal_number,
                    'journal_date' => optional($journal->journal_date)->format('Y-m-d'),
                    'source_type' => $journal->source_type,
                    'memo' => $journal->memo,
                ],
            ], 201);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}

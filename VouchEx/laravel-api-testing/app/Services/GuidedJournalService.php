<?php

namespace App\Services;

use App\Models\GlAccount;
use App\Models\GlJournal;
use App\Support\TenantContext;
use RuntimeException;

class GuidedJournalService
{
    public function __construct(
        private GlPostingService $gl,
        private GlAccountService $accounts,
    ) {}

    /** @param  list<array{gl_account_id: int, debit?: float, credit?: float, memo?: string}>  $lines */
    public function postManualJournal(string $date, array $lines, ?string $memo, ?int $userId): GlJournal
    {
        $this->accounts->ensureCompanyChart((int) TenantContext::getCompanyId());
        $resolved = [];
        foreach ($lines as $line) {
            $account = $this->findAccount((int) $line['gl_account_id']);
            $resolved[] = [
                'account' => $account,
                'debit' => (float) ($line['debit'] ?? 0),
                'credit' => (float) ($line['credit'] ?? 0),
                'memo' => $line['memo'] ?? null,
            ];
        }

        return $this->gl->postJournal($date, 'manual_journal', $this->nextSourceId(), $resolved, $memo ?: 'Manual journal entry', $userId);
    }

    public function postBankCashTransfer(string $date, int $fromAccountId, int $toAccountId, float $amount, ?string $memo, ?int $userId): GlJournal
    {
        $from = $this->findAccount($fromAccountId);
        $to = $this->findAccount($toAccountId);
        $this->assertTransferAccounts($from, $to);

        return $this->gl->postJournal($date, 'guided_contra', $this->nextSourceId(), [
            ['account' => $to, 'debit' => $amount, 'credit' => 0, 'memo' => $memo],
            ['account' => $from, 'debit' => 0, 'credit' => $amount, 'memo' => $memo],
        ], $memo ?: 'Bank / Cash transfer', $userId);
    }

    public function postCapitalIntroduction(string $date, int $bankAccountId, float $amount, ?string $memo, ?int $userId): GlJournal
    {
        $bank = $this->findAccount($bankAccountId);
        $capital = $this->resolveEquityAccount(['capital', 'equity_capital'], 'Capital');

        return $this->gl->postJournal($date, 'guided_capital', $this->nextSourceId(), [
            ['account' => $bank, 'debit' => $amount, 'credit' => 0, 'memo' => $memo],
            ['account' => $capital, 'debit' => 0, 'credit' => $amount, 'memo' => $memo],
        ], $memo ?: 'Capital introduction', $userId);
    }

    public function postOwnerWithdrawal(string $date, int $bankAccountId, float $amount, ?string $memo, ?int $userId): GlJournal
    {
        $bank = $this->findAccount($bankAccountId);
        $drawings = $this->resolveEquityAccount(['drawings', 'owner_drawings'], 'Drawings');

        return $this->gl->postJournal($date, 'guided_drawings', $this->nextSourceId(), [
            ['account' => $drawings, 'debit' => $amount, 'credit' => 0, 'memo' => $memo],
            ['account' => $bank, 'debit' => 0, 'credit' => $amount, 'memo' => $memo],
        ], $memo ?: 'Owner withdrawal', $userId);
    }

    public function postLoanReceived(string $date, int $bankAccountId, int $loanAccountId, float $amount, ?string $memo, ?int $userId): GlJournal
    {
        $bank = $this->findAccount($bankAccountId);
        $loan = $this->findAccount($loanAccountId);

        return $this->gl->postJournal($date, 'guided_loan_received', $this->nextSourceId(), [
            ['account' => $bank, 'debit' => $amount, 'credit' => 0, 'memo' => $memo],
            ['account' => $loan, 'debit' => 0, 'credit' => $amount, 'memo' => $memo],
        ], $memo ?: 'Loan received', $userId);
    }

    public function postLoanRepayment(string $date, int $bankAccountId, int $loanAccountId, float $amount, ?string $memo, ?int $userId): GlJournal
    {
        $bank = $this->findAccount($bankAccountId);
        $loan = $this->findAccount($loanAccountId);

        return $this->gl->postJournal($date, 'guided_loan_repayment', $this->nextSourceId(), [
            ['account' => $loan, 'debit' => $amount, 'credit' => 0, 'memo' => $memo],
            ['account' => $bank, 'debit' => 0, 'credit' => $amount, 'memo' => $memo],
        ], $memo ?: 'Loan repayment', $userId);
    }

    public function postDepreciation(string $date, int $expenseAccountId, int $assetAccountId, float $amount, ?string $memo, ?int $userId): GlJournal
    {
        $expense = $this->findAccount($expenseAccountId);
        $asset = $this->findAccount($assetAccountId);

        return $this->gl->postJournal($date, 'guided_depreciation', $this->nextSourceId(), [
            ['account' => $expense, 'debit' => $amount, 'credit' => 0, 'memo' => $memo],
            ['account' => $asset, 'debit' => 0, 'credit' => $amount, 'memo' => $memo],
        ], $memo ?: 'Depreciation', $userId);
    }

    public function postStatutoryPayment(string $date, int $bankAccountId, int $statutoryAccountId, float $amount, ?string $memo, ?int $userId): GlJournal
    {
        $bank = $this->findAccount($bankAccountId);
        $statutory = $this->findAccount($statutoryAccountId);

        return $this->gl->postJournal($date, 'guided_statutory_payment', $this->nextSourceId(), [
            ['account' => $statutory, 'debit' => $amount, 'credit' => 0, 'memo' => $memo],
            ['account' => $bank, 'debit' => 0, 'credit' => $amount, 'memo' => $memo],
        ], $memo ?: 'Statutory payment (GST/TDS)', $userId);
    }

    private function findAccount(int $id): GlAccount
    {
        $companyId = (int) TenantContext::getCompanyId();
        $account = GlAccount::withoutGlobalScopes()->where('company_id', $companyId)->where('id', $id)->first();
        if (! $account) {
            throw new RuntimeException('Ledger account not found.');
        }

        return $account;
    }

    private function resolveEquityAccount(array $subtypes, string $label): GlAccount
    {
        $companyId = (int) TenantContext::getCompanyId();
        $account = GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where(function ($q) use ($subtypes) {
                $q->whereIn('account_subtype', $subtypes)->orWhere('account_type', 'equity');
            })
            ->orderBy('code')
            ->first();

        if (! $account) {
            throw new RuntimeException("Create a {$label} account in Chart of Accounts first.");
        }

        return $account;
    }

    private function assertTransferAccounts(GlAccount $from, GlAccount $to): void
    {
        if ($from->id === $to->id) {
            throw new RuntimeException('From and To accounts must be different.');
        }
    }

    private function nextSourceId(): int
    {
        $companyId = (int) TenantContext::getCompanyId();

        return (int) GlJournal::withoutGlobalScopes()->where('company_id', $companyId)->max('id') + 1;
    }
}

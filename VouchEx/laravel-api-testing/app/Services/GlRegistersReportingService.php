<?php

namespace App\Services;

use App\Models\CreditNote;
use App\Models\DebitNote;
use App\Models\Expense;
use App\Models\GlAccount;
use App\Models\GlJournal;
use App\Models\GlJournalLine;
use App\Models\Invoice;
use App\Support\TenantContext;

class GlRegistersReportingService
{
    public function dayBook(?string $fromDate = null, ?string $toDate = null): array
    {
        $companyId = (int) TenantContext::getCompanyId();

        $query = GlJournalLine::query()
            ->join('gl_journals', 'gl_journals.id', '=', 'gl_journal_lines.journal_id')
            ->where('gl_journal_lines.company_id', $companyId)
            ->select(
                'gl_journals.journal_date',
                'gl_journals.journal_number',
                'gl_journals.source_type',
                'gl_journals.source_id',
                'gl_journals.memo',
                'gl_journal_lines.account_code',
                'gl_journal_lines.account_name',
                'gl_journal_lines.debit',
                'gl_journal_lines.credit',
                'gl_journal_lines.line_memo',
                'gl_journal_lines.gl_account_id'
            )
            ->orderBy('gl_journals.journal_date')
            ->orderBy('gl_journals.id')
            ->orderBy('gl_journal_lines.id');

        if ($fromDate) {
            $query->where('gl_journals.journal_date', '>=', $fromDate);
        }
        if ($toDate) {
            $query->where('gl_journals.journal_date', '<=', $toDate);
        }

        $rows = [];
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($query->get() as $line) {
            $debit = round((float) $line->debit, 2);
            $credit = round((float) $line->credit, 2);
            $totalDebit += $debit;
            $totalCredit += $credit;
            $rows[] = [
                'date' => optional($line->journal_date)->format('Y-m-d'),
                'journal_number' => $line->journal_number,
                'source_type' => $line->source_type,
                'source_id' => $line->source_id,
                'account_code' => $line->account_code,
                'account_name' => $line->account_name,
                'gl_account_id' => (int) $line->gl_account_id,
                'particulars' => $line->line_memo ?: $line->memo,
                'debit' => $debit,
                'credit' => $credit,
            ];
        }

        return [
            'from' => $fromDate,
            'to' => $toDate,
            'rows' => $rows,
            'totals' => ['debit' => round($totalDebit, 2), 'credit' => round($totalCredit, 2)],
        ];
    }

    public function salesRegister(?string $fromDate = null, ?string $toDate = null): array
    {
        $companyId = (int) TenantContext::getCompanyId();
        $rows = [];

        $invoices = Invoice::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('status', '!=', 'Cancelled')
            ->when($fromDate, fn ($q) => $q->where('issue_date', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->where('issue_date', '<=', $toDate))
            ->orderBy('issue_date')
            ->get();

        foreach ($invoices as $inv) {
            $rows[] = $this->registerRowFromAmounts(
                optional($inv->issue_date)->format('Y-m-d'),
                'Invoice',
                $inv->invoice_number,
                $inv->customer_name,
                $inv->gstin ?? '',
                (float) ($inv->subtotal ?? 0),
                (float) ($inv->cgst ?? 0),
                (float) ($inv->sgst ?? 0),
                (float) ($inv->igst ?? 0),
                (float) $inv->total_amount
            );
        }

        $creditNotes = CreditNote::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->with('customer:id,gstin')
            ->when($fromDate, fn ($q) => $q->where('issue_date', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->where('issue_date', '<=', $toDate))
            ->orderBy('issue_date')
            ->get();

        foreach ($creditNotes as $cn) {
            $rows[] = $this->registerRowFromAmounts(
                optional($cn->issue_date)->format('Y-m-d'),
                'Credit Note',
                $cn->credit_note_number,
                $cn->customer_name ?? '',
                $cn->customer?->gstin ?? '',
                -abs((float) ($cn->subtotal ?? 0)),
                -abs((float) ($cn->cgst ?? 0)),
                -abs((float) ($cn->sgst ?? 0)),
                -abs((float) ($cn->igst ?? 0)),
                -abs((float) $cn->total_amount)
            );
        }

        usort($rows, fn ($a, $b) => strcmp($a['date'] ?? '', $b['date'] ?? ''));

        return ['from' => $fromDate, 'to' => $toDate, 'rows' => $rows, 'totals' => $this->sumRegisterRows($rows)];
    }

    public function purchaseRegister(?string $fromDate = null, ?string $toDate = null): array
    {
        $companyId = (int) TenantContext::getCompanyId();
        $rows = [];

        $expenses = Expense::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->with('vendor:id,gstin')
            ->when($fromDate, fn ($q) => $q->where('expense_date', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->where('expense_date', '<=', $toDate))
            ->orderBy('expense_date')
            ->get();

        foreach ($expenses as $exp) {
            $taxable = (float) ($exp->amount ?? 0);
            $rows[] = $this->registerRowFromAmounts(
                optional($exp->expense_date)->format('Y-m-d'),
                ($exp->record_type ?? 'expense') === 'purchase' ? 'Purchase' : 'Expense',
                $exp->expense_number,
                $exp->vendor_name ?? '',
                $exp->vendor?->gstin ?? '',
                $taxable,
                (float) ($exp->cgst ?? 0),
                (float) ($exp->sgst ?? 0),
                (float) ($exp->igst ?? 0),
                (float) ($exp->total_amount ?? $exp->amount ?? 0)
            );
        }

        $debitNotes = DebitNote::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->with('vendor:id,gstin')
            ->when($fromDate, fn ($q) => $q->where('issue_date', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->where('issue_date', '<=', $toDate))
            ->orderBy('issue_date')
            ->get();

        foreach ($debitNotes as $dn) {
            $rows[] = $this->registerRowFromAmounts(
                optional($dn->issue_date)->format('Y-m-d'),
                'Debit Note',
                $dn->debit_note_number,
                $dn->vendor_name ?? '',
                $dn->vendor?->gstin ?? '',
                -abs((float) ($dn->subtotal ?? 0)),
                -abs((float) ($dn->cgst ?? 0)),
                -abs((float) ($dn->sgst ?? 0)),
                -abs((float) ($dn->igst ?? 0)),
                -abs((float) $dn->total_amount)
            );
        }

        usort($rows, fn ($a, $b) => strcmp($a['date'] ?? '', $b['date'] ?? ''));

        return ['from' => $fromDate, 'to' => $toDate, 'rows' => $rows, 'totals' => $this->sumRegisterRows($rows)];
    }

    public function ledgerAccounts(): array
    {
        $companyId = (int) TenantContext::getCompanyId();

        return GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'account_type', 'account_subtype'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'code' => $a->code,
                'name' => $a->name,
                'account_type' => $a->account_type,
                'account_subtype' => $a->account_subtype,
            ])
            ->all();
    }

    public function recentGuidedJournals(int $limit = 50): array
    {
        $companyId = (int) TenantContext::getCompanyId();

        return GlJournal::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where(function ($q) {
                $q->where('source_type', 'like', 'guided_%')
                    ->orWhere('source_type', 'manual_journal');
            })
            ->withSum('lines as total_debit', 'debit')
            ->orderByDesc('journal_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn ($j) => [
                'id' => $j->id,
                'journal_number' => $j->journal_number,
                'journal_date' => optional($j->journal_date)->format('Y-m-d'),
                'source_type' => $j->source_type,
                'memo' => $j->memo,
                'total_debit' => round((float) ($j->total_debit ?? 0), 2),
            ])
            ->all();
    }

    private function registerRowFromAmounts(
        ?string $date,
        string $type,
        string $number,
        string $party,
        string $gstin,
        float $taxable,
        float $cgst,
        float $sgst,
        float $igst,
        float $total
    ): array {
        return [
            'date' => $date,
            'document_type' => $type,
            'document_number' => $number,
            'party_name' => $party,
            'gstin' => $gstin,
            'taxable_value' => round($taxable, 2),
            'cgst' => round($cgst, 2),
            'sgst' => round($sgst, 2),
            'igst' => round($igst, 2),
            'invoice_value' => round($total, 2),
        ];
    }

    private function sumRegisterRows(array $rows): array
    {
        $totals = ['taxable_value' => 0, 'cgst' => 0, 'sgst' => 0, 'igst' => 0, 'invoice_value' => 0];
        foreach ($rows as $row) {
            foreach (array_keys($totals) as $key) {
                $totals[$key] += (float) ($row[$key] ?? 0);
            }
        }

        return array_map(fn ($v) => round($v, 2), $totals);
    }
}

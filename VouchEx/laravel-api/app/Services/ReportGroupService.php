<?php

namespace App\Services;

use App\Models\GlAccount;
use App\Models\ReportGroup;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReportGroupService
{
    /** @return list<array> */
    public function tree(int $companyId): array
    {
        $groups = ReportGroup::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $byParent = $groups->groupBy(fn ($g) => (string) ($g->parent_id ?? 'root'));

        return $this->buildTreeNodes($byParent, 'root');
    }

    public function createGroup(array $data): ReportGroup
    {
        $companyId = (int) TenantContext::getCompanyId();

        return ReportGroup::create([
            'company_id' => $companyId,
            'parent_id' => $data['parent_id'] ?? null,
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'statement_type' => $data['statement_type'] ?? 'balance_sheet',
            'nature' => $data['nature'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_system' => false,
            'active' => true,
        ]);
    }

    public function updateGroup(ReportGroup $group, array $data): ReportGroup
    {
        if (isset($data['parent_id']) && (int) $data['parent_id'] === $group->id) {
            throw ValidationException::withMessages(['parent_id' => 'A group cannot be its own parent.']);
        }

        $group->update([
            'parent_id' => $data['parent_id'] ?? $group->parent_id,
            'name' => $data['name'] ?? $group->name,
            'code' => $data['code'] ?? $group->code,
            'statement_type' => $data['statement_type'] ?? $group->statement_type,
            'nature' => $data['nature'] ?? $group->nature,
            'sort_order' => $data['sort_order'] ?? $group->sort_order,
            'active' => $data['active'] ?? $group->active,
        ]);

        return $group->fresh();
    }

    public function deleteGroup(ReportGroup $group): void
    {
        if (ReportGroup::where('parent_id', $group->id)->exists()) {
            throw ValidationException::withMessages(['group' => 'Remove or reassign child groups first.']);
        }
        GlAccount::where('report_group_id', $group->id)->update(['report_group_id' => null]);
        $group->delete();
    }

    public function loadTemplate(int $companyId, string $template): int
    {
        if (ReportGroup::withoutGlobalScopes()->where('company_id', $companyId)->exists()) {
            throw ValidationException::withMessages([
                'template' => 'Report groups already exist. Delete existing groups before loading a template.',
            ]);
        }

        $rows = match ($template) {
            'schedule_iii_as' => self::scheduleIiiAsTemplate(),
            'schedule_iii_ind_as' => self::scheduleIiiIndAsTemplate(),
            default => throw ValidationException::withMessages(['template' => 'Unknown template.']),
        };

        $created = 0;
        DB::transaction(function () use ($companyId, $rows, &$created) {
            $idMap = [];
            foreach ($rows as $index => $row) {
                $parentKey = $row['parent_key'] ?? null;
                $group = ReportGroup::create([
                    'company_id' => $companyId,
                    'parent_id' => $parentKey ? ($idMap[$parentKey] ?? null) : null,
                    'name' => $row['name'],
                    'code' => $row['code'] ?? null,
                    'statement_type' => $row['statement_type'],
                    'nature' => $row['nature'] ?? null,
                    'sort_order' => $index,
                    'is_system' => true,
                    'active' => true,
                ]);
                $idMap[$row['key']] = $group->id;
                $created++;
            }
        });

        return $created;
    }

    /** @param  list<array{gl_account_id: int, report_group_id: ?int}>  $assignments */
    public function bulkAssign(array $assignments): int
    {
        $count = 0;
        foreach ($assignments as $row) {
            GlAccount::where('id', $row['gl_account_id'])->update([
                'report_group_id' => $row['report_group_id'] ?? null,
            ]);
            $count++;
        }

        return $count;
    }

    /** @return list<array{key: string, parent_key: ?string, name: string, code: ?string, statement_type: string, nature: ?string}> */
    private static function scheduleIiiAsTemplate(): array
    {
        return [
            ['key' => 'bs_root', 'parent_key' => null, 'name' => 'Balance Sheet', 'code' => 'BS', 'statement_type' => 'balance_sheet', 'nature' => 'heading'],
            ['key' => 'assets', 'parent_key' => 'bs_root', 'name' => 'Assets', 'code' => 'A', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'nca', 'parent_key' => 'assets', 'name' => 'Non-current assets', 'code' => 'NCA', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'ppe', 'parent_key' => 'nca', 'name' => 'Property, plant and equipment', 'code' => 'PPE', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'intangible', 'parent_key' => 'nca', 'name' => 'Intangible assets', 'code' => 'IA', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'investments_nca', 'parent_key' => 'nca', 'name' => 'Non-current investments', 'code' => 'NCI', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'ca', 'parent_key' => 'assets', 'name' => 'Current assets', 'code' => 'CA', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'fin_assets', 'parent_key' => 'ca', 'name' => 'Financial assets', 'code' => 'FA', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'trade_recv', 'parent_key' => 'fin_assets', 'name' => 'Trade receivables', 'code' => 'TR', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'cash_bank', 'parent_key' => 'fin_assets', 'name' => 'Cash and cash equivalents', 'code' => 'CCE', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'bank_bal', 'parent_key' => 'fin_assets', 'name' => 'Bank balances', 'code' => 'BB', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'other_ca', 'parent_key' => 'ca', 'name' => 'Other current assets', 'code' => 'OCA', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'inventory_grp', 'parent_key' => 'ca', 'name' => 'Inventories', 'code' => 'INV', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'liabilities', 'parent_key' => 'bs_root', 'name' => 'Liabilities', 'code' => 'L', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'ncl', 'parent_key' => 'liabilities', 'name' => 'Non-current liabilities', 'code' => 'NCL', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'borrowings_ncl', 'parent_key' => 'ncl', 'name' => 'Long-term borrowings', 'code' => 'LTB', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'cl', 'parent_key' => 'liabilities', 'name' => 'Current liabilities', 'code' => 'CL', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'trade_pay', 'parent_key' => 'cl', 'name' => 'Trade payables', 'code' => 'TP', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'statutory', 'parent_key' => 'cl', 'name' => 'Statutory dues & GST payable', 'code' => 'SD', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'equity', 'parent_key' => 'bs_root', 'name' => 'Equity', 'code' => 'E', 'statement_type' => 'balance_sheet', 'nature' => 'equity'],
            ['key' => 'capital', 'parent_key' => 'equity', 'name' => 'Share capital / Owner\'s capital', 'code' => 'SC', 'statement_type' => 'balance_sheet', 'nature' => 'equity'],
            ['key' => 'reserves', 'parent_key' => 'equity', 'name' => 'Reserves and surplus', 'code' => 'RS', 'statement_type' => 'balance_sheet', 'nature' => 'equity'],
            ['key' => 'pl_root', 'parent_key' => null, 'name' => 'Statement of Profit and Loss', 'code' => 'PL', 'statement_type' => 'profit_loss', 'nature' => 'heading'],
            ['key' => 'revenue', 'parent_key' => 'pl_root', 'name' => 'Revenue from operations', 'code' => 'REV', 'statement_type' => 'profit_loss', 'nature' => 'income'],
            ['key' => 'other_income', 'parent_key' => 'pl_root', 'name' => 'Other income', 'code' => 'OI', 'statement_type' => 'profit_loss', 'nature' => 'income'],
            ['key' => 'expenses', 'parent_key' => 'pl_root', 'name' => 'Expenses', 'code' => 'EXP', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'cogs', 'parent_key' => 'expenses', 'name' => 'Cost of materials / COGS', 'code' => 'COGS', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'emp_ben', 'parent_key' => 'expenses', 'name' => 'Employee benefits expense', 'code' => 'EBE', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'finance_cost', 'parent_key' => 'expenses', 'name' => 'Finance costs', 'code' => 'FC', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'depreciation', 'parent_key' => 'expenses', 'name' => 'Depreciation and amortisation', 'code' => 'DEP', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'other_exp', 'parent_key' => 'expenses', 'name' => 'Other expenses', 'code' => 'OEXP', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'admin_exp', 'parent_key' => 'other_exp', 'name' => 'Administrative expenses', 'code' => 'ADM', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'selling_exp', 'parent_key' => 'other_exp', 'name' => 'Selling & distribution expenses', 'code' => 'SDE', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
        ];
    }

    /** Schedule III Division II — Ind AS presentation (simplified starter tree). */
    private static function scheduleIiiIndAsTemplate(): array
    {
        return [
            ['key' => 'bs_root', 'parent_key' => null, 'name' => 'Balance Sheet (Ind AS)', 'code' => 'BS', 'statement_type' => 'balance_sheet', 'nature' => 'heading'],
            ['key' => 'assets', 'parent_key' => 'bs_root', 'name' => 'Assets', 'code' => 'A', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'nca', 'parent_key' => 'assets', 'name' => 'Non-current assets', 'code' => 'NCA', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'ppe', 'parent_key' => 'nca', 'name' => 'Property, plant and equipment', 'code' => 'PPE', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'rou', 'parent_key' => 'nca', 'name' => 'Right-of-use assets', 'code' => 'ROU', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'intangible', 'parent_key' => 'nca', 'name' => 'Intangible assets', 'code' => 'IA', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'investments_nca', 'parent_key' => 'nca', 'name' => 'Non-current investments', 'code' => 'NCI', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'ca', 'parent_key' => 'assets', 'name' => 'Current assets', 'code' => 'CA', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'fin_assets', 'parent_key' => 'ca', 'name' => 'Financial assets', 'code' => 'FA', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'trade_recv', 'parent_key' => 'fin_assets', 'name' => 'Trade receivables', 'code' => 'TR', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'contract_asset', 'parent_key' => 'fin_assets', 'name' => 'Contract assets', 'code' => 'CA2', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'cash_bank', 'parent_key' => 'fin_assets', 'name' => 'Cash and cash equivalents', 'code' => 'CCE', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'bank_bal', 'parent_key' => 'fin_assets', 'name' => 'Bank balances', 'code' => 'BB', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'other_ca', 'parent_key' => 'ca', 'name' => 'Other current assets', 'code' => 'OCA', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'inventory_grp', 'parent_key' => 'ca', 'name' => 'Inventories', 'code' => 'INV', 'statement_type' => 'balance_sheet', 'nature' => 'asset'],
            ['key' => 'liabilities', 'parent_key' => 'bs_root', 'name' => 'Liabilities', 'code' => 'L', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'ncl', 'parent_key' => 'liabilities', 'name' => 'Non-current liabilities', 'code' => 'NCL', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'borrowings_ncl', 'parent_key' => 'ncl', 'name' => 'Borrowings (non-current)', 'code' => 'LTB', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'lease_liab', 'parent_key' => 'ncl', 'name' => 'Lease liabilities (non-current)', 'code' => 'LL', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'cl', 'parent_key' => 'liabilities', 'name' => 'Current liabilities', 'code' => 'CL', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'trade_pay', 'parent_key' => 'cl', 'name' => 'Trade payables', 'code' => 'TP', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'contract_liab', 'parent_key' => 'cl', 'name' => 'Contract liabilities', 'code' => 'CL2', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'statutory', 'parent_key' => 'cl', 'name' => 'Statutory dues & GST payable', 'code' => 'SD', 'statement_type' => 'balance_sheet', 'nature' => 'liability'],
            ['key' => 'equity', 'parent_key' => 'bs_root', 'name' => 'Equity', 'code' => 'E', 'statement_type' => 'balance_sheet', 'nature' => 'equity'],
            ['key' => 'capital', 'parent_key' => 'equity', 'name' => 'Equity share capital', 'code' => 'SC', 'statement_type' => 'balance_sheet', 'nature' => 'equity'],
            ['key' => 'reserves', 'parent_key' => 'equity', 'name' => 'Other equity (reserves & surplus)', 'code' => 'RS', 'statement_type' => 'balance_sheet', 'nature' => 'equity'],
            ['key' => 'pl_root', 'parent_key' => null, 'name' => 'Statement of Profit and Loss (Ind AS)', 'code' => 'PL', 'statement_type' => 'profit_loss', 'nature' => 'heading'],
            ['key' => 'revenue', 'parent_key' => 'pl_root', 'name' => 'Revenue from operations', 'code' => 'REV', 'statement_type' => 'profit_loss', 'nature' => 'income'],
            ['key' => 'other_income', 'parent_key' => 'pl_root', 'name' => 'Other income', 'code' => 'OI', 'statement_type' => 'profit_loss', 'nature' => 'income'],
            ['key' => 'expenses', 'parent_key' => 'pl_root', 'name' => 'Expenses', 'code' => 'EXP', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'cogs', 'parent_key' => 'expenses', 'name' => 'Cost of materials consumed / COGS', 'code' => 'COGS', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'emp_ben', 'parent_key' => 'expenses', 'name' => 'Employee benefits expense', 'code' => 'EBE', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'finance_cost', 'parent_key' => 'expenses', 'name' => 'Finance costs', 'code' => 'FC', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'depreciation', 'parent_key' => 'expenses', 'name' => 'Depreciation, amortisation and impairment', 'code' => 'DEP', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'other_exp', 'parent_key' => 'expenses', 'name' => 'Other expenses', 'code' => 'OEXP', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'admin_exp', 'parent_key' => 'other_exp', 'name' => 'Administrative expenses', 'code' => 'ADM', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
            ['key' => 'selling_exp', 'parent_key' => 'other_exp', 'name' => 'Selling & distribution expenses', 'code' => 'SDE', 'statement_type' => 'profit_loss', 'nature' => 'expense'],
        ];
    }

    /** @param  \Illuminate\Support\Collection<string, \Illuminate\Support\Collection<int, ReportGroup>>  $byParent */
    private function buildTreeNodes($byParent, string $parentKey): array
    {
        $nodes = [];
        foreach ($byParent->get($parentKey, collect()) as $group) {
            $nodes[] = [
                'id' => $group->id,
                'parent_id' => $group->parent_id,
                'name' => $group->name,
                'code' => $group->code,
                'statement_type' => $group->statement_type,
                'nature' => $group->nature,
                'sort_order' => $group->sort_order,
                'is_system' => (bool) $group->is_system,
                'children' => $this->buildTreeNodes($byParent, (string) $group->id),
            ];
        }

        return $nodes;
    }
}

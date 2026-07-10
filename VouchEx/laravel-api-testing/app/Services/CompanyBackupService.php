<?php

namespace App\Services;

use App\Models\Company;
use App\Models\CompanySetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;

class CompanyBackupService
{
    public const FORMAT = 'vouchex-company-backup';

    public const VERSION = 1;

    public function buildPayload(int $companyId): array
    {
        $company = Company::findOrFail($companyId);
        $settings = CompanySetting::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->first();

        $companyName = $settings?->name ?: $company->name;

        $invoiceIds = $this->ids('invoices', $companyId);
        $creditNoteIds = $this->ids('credit_notes', $companyId);
        $debitNoteIds = $this->ids('debit_notes', $companyId);
        $expenseIds = $this->ids('expenses', $companyId);

        return [
            'format' => self::FORMAT,
            'version' => self::VERSION,
            'exported_at' => now()->toIso8601String(),
            'company_id' => $companyId,
            'company_name' => $companyName,
            'data' => [
                'company' => $this->row('companies', $companyId),
                'company_settings' => $settings ? $this->modelAttributes($settings) : null,
                'logo_assets' => $this->exportLogoAssets($settings),
                'users' => $this->userRows($companyId),
                'customers' => $this->companyRows('customers', $companyId),
                'vendors' => $this->companyRows('vendors', $companyId),
                'inventories' => $this->companyRows('inventories', $companyId),
                'expense_heads' => $this->companyRows('expense_heads', $companyId),
                'bank_ledgers' => $this->companyRows('bank_ledgers', $companyId),
                'cash_ledgers' => $this->companyRows('cash_ledgers', $companyId),
                'invoices' => $this->companyRows('invoices', $companyId),
                'invoice_items' => $this->childRows('invoice_items', 'invoice_id', $invoiceIds),
                'receipts' => $this->companyRows('receipts', $companyId),
                'expenses' => $this->companyRows('expenses', $companyId),
                'expense_line_items' => $this->childRows('expense_line_items', 'expense_id', $expenseIds),
                'payments' => $this->companyRows('payments', $companyId),
                'credit_notes' => $this->companyRows('credit_notes', $companyId),
                'credit_note_items' => $this->childRows('credit_note_items', 'credit_note_id', $creditNoteIds),
                'debit_notes' => $this->companyRows('debit_notes', $companyId),
                'debit_note_items' => $this->childRows('debit_note_items', 'debit_note_id', $debitNoteIds),
                'ecrs_logs' => $this->companyRows('ecrs_logs', $companyId),
                'audit_logs' => $this->companyRows('audit_logs', $companyId),
                'login_logs' => $this->companyRows('login_logs', $companyId),
                'cron_reminder_logs' => $this->companyRows('cron_reminder_logs', $companyId),
                'document_locks' => $this->companyRows('document_locks', $companyId),
                'sync_events' => $this->companyRows('sync_events', $companyId),
                'calendar_reminders' => $this->companyRows('calendar_reminders', $companyId),
            ],
        ];
    }

    public function toJson(int $companyId, int $flags = JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT): string
    {
        $json = json_encode($this->buildPayload($companyId), $flags);
        if ($json === false) {
            throw new RuntimeException('Failed to encode company backup JSON.');
        }

        return $json;
    }

    public static function filenameFor(string $companyName, ?\DateTimeInterface $at = null): string
    {
        $at = $at ?? now();
        $safe = preg_replace('/[^A-Za-z0-9]+/', '_', trim($companyName));
        $safe = trim((string) $safe, '_') ?: 'Company';

        return sprintf('Vouchex_%s_%s.json', $safe, $at->format('Y-m-d'));
    }

    public function restore(int $targetCompanyId, array $payload): void
    {
        $this->validatePayload($payload, $targetCompanyId);

        DB::transaction(function () use ($targetCompanyId, $payload) {
            $this->purgeCompanyData($targetCompanyId);
            $data = $payload['data'];

            $this->insertRows('users', $data['users'] ?? []);
            $this->insertRows('expense_heads', $data['expense_heads'] ?? []);
            $this->insertRows('bank_ledgers', $data['bank_ledgers'] ?? []);
            $this->insertRows('cash_ledgers', $data['cash_ledgers'] ?? []);
            $this->insertRows('customers', $data['customers'] ?? []);
            $this->insertRows('vendors', $data['vendors'] ?? []);
            $this->insertRows('inventories', $data['inventories'] ?? []);
            $this->insertRows('invoices', $data['invoices'] ?? []);
            $this->insertRows('invoice_items', $data['invoice_items'] ?? []);
            $this->insertRows('credit_notes', $data['credit_notes'] ?? []);
            $this->insertRows('credit_note_items', $data['credit_note_items'] ?? []);
            $this->insertRows('debit_notes', $data['debit_notes'] ?? []);
            $this->insertRows('debit_note_items', $data['debit_note_items'] ?? []);
            $this->insertRows('expenses', $data['expenses'] ?? []);
            $this->insertRows('expense_line_items', $data['expense_line_items'] ?? []);
            $this->insertRows('receipts', $data['receipts'] ?? []);
            $this->insertRows('payments', $data['payments'] ?? []);
            $this->insertRows('ecrs_logs', $data['ecrs_logs'] ?? []);
            $this->insertRows('audit_logs', $data['audit_logs'] ?? []);
            $this->insertRows('login_logs', $data['login_logs'] ?? []);
            $this->insertRows('cron_reminder_logs', $data['cron_reminder_logs'] ?? []);
            $this->insertRows('document_locks', $data['document_locks'] ?? []);
            $this->insertRows('sync_events', $data['sync_events'] ?? []);
            $this->insertRows('calendar_reminders', $data['calendar_reminders'] ?? []);

            if (!empty($data['company_settings'])) {
                $this->upsertCompanySettings($targetCompanyId, $data['company_settings']);
            }

            if (!empty($data['company'])) {
                $this->upsertCompanyMeta($targetCompanyId, $data['company']);
            }

            $this->restoreLogoAssets($targetCompanyId, $data['logo_assets'] ?? []);
        });
    }

    public function validatePayload(array $payload, int $targetCompanyId): void
    {
        if (($payload['format'] ?? '') !== self::FORMAT) {
            throw new RuntimeException('Invalid backup file: unrecognized format.');
        }
        if ((int) ($payload['version'] ?? 0) !== self::VERSION) {
            throw new RuntimeException('Unsupported backup version.');
        }
        if ((int) ($payload['company_id'] ?? 0) !== $targetCompanyId) {
            throw new RuntimeException(
                'This backup belongs to a different company. Select that company in the header before restoring.'
            );
        }
        if (empty($payload['data']) || !is_array($payload['data'])) {
            throw new RuntimeException('Backup file is missing data section.');
        }
    }

    public function purgeCompanyData(int $companyId): void
    {
        $invoiceIds = $this->ids('invoices', $companyId);
        $creditNoteIds = $this->ids('credit_notes', $companyId);
        $debitNoteIds = $this->ids('debit_notes', $companyId);
        $expenseIds = $this->ids('expenses', $companyId);

        if ($invoiceIds->isNotEmpty()) {
            DB::table('invoice_items')->whereIn('invoice_id', $invoiceIds)->delete();
        }
        if ($expenseIds->isNotEmpty()) {
            DB::table('expense_line_items')->whereIn('expense_id', $expenseIds)->delete();
        }
        if ($creditNoteIds->isNotEmpty()) {
            DB::table('credit_note_items')->whereIn('credit_note_id', $creditNoteIds)->delete();
        }
        if ($debitNoteIds->isNotEmpty()) {
            DB::table('debit_note_items')->whereIn('debit_note_id', $debitNoteIds)->delete();
        }

        foreach ([
            'receipts', 'payments', 'invoices', 'credit_notes', 'debit_notes', 'expenses',
            'document_locks', 'sync_events', 'calendar_reminders', 'cron_reminder_logs',
            'audit_logs', 'login_logs', 'ecrs_logs',
            'customers', 'vendors', 'inventories',
            'expense_heads', 'bank_ledgers', 'cash_ledgers',
        ] as $table) {
            DB::table($table)->where('company_id', $companyId)->delete();
        }

        DB::table('users')
            ->where('company_id', $companyId)
            ->where('role', '!=', 'super_admin')
            ->delete();
    }

    private function ids(string $table, int $companyId)
    {
        return DB::table($table)->where('company_id', $companyId)->pluck('id');
    }

    private function row(string $table, int $id): ?array
    {
        $row = DB::table($table)->where('id', $id)->first();

        return $row ? $this->normalizeExportRow((array) $row) : null;
    }

    private function companyRows(string $table, int $companyId): array
    {
        return DB::table($table)
            ->where('company_id', $companyId)
            ->orderBy('id')
            ->get()
            ->map(fn ($r) => $this->normalizeExportRow((array) $r))
            ->all();
    }

    private function childRows(string $table, string $fk, $parentIds): array
    {
        if ($parentIds->isEmpty()) {
            return [];
        }

        return DB::table($table)
            ->whereIn($fk, $parentIds)
            ->orderBy('id')
            ->get()
            ->map(fn ($r) => $this->normalizeExportRow((array) $r))
            ->all();
    }

    private function userRows(int $companyId): array
    {
        return DB::table('users')
            ->where('company_id', $companyId)
            ->where('role', '!=', 'super_admin')
            ->orderBy('id')
            ->get()
            ->map(fn ($r) => $this->normalizeExportRow((array) $r))
            ->all();
    }

    private function normalizeExportRow(array $row): array
    {
        foreach ($row as $key => $value) {
            if ($value instanceof \DateTimeInterface) {
                $row[$key] = $value->format('Y-m-d H:i:s');
            }
        }

        return $row;
    }

    private function modelAttributes(CompanySetting $model): array
    {
        return $this->normalizeExportRow($model->getAttributes());
    }

    private function insertRows(string $table, array $rows): void
    {
        foreach ($rows as $row) {
            $row = (array) $row;
            if (isset($row['company_id'])) {
                $row['company_id'] = (int) $row['company_id'];
            }
            foreach (['locked_months', 'custom_options'] as $jsonCol) {
                if (array_key_exists($jsonCol, $row) && is_array($row[$jsonCol])) {
                    $row[$jsonCol] = json_encode($row[$jsonCol]);
                }
            }
            DB::table($table)->insert($row);
        }
    }

    private function upsertCompanySettings(int $companyId, array $row): void
    {
        $row = (array) $row;
        unset($row['id']);
        $row['company_id'] = $companyId;
        foreach (['locked_months', 'custom_options'] as $jsonCol) {
            if (array_key_exists($jsonCol, $row) && is_array($row[$jsonCol])) {
                $row[$jsonCol] = json_encode($row[$jsonCol]);
            }
        }
        CompanySetting::withoutGlobalScopes()->updateOrCreate(
            ['company_id' => $companyId],
            $row
        );
    }

    private function upsertCompanyMeta(int $companyId, array $row): void
    {
        $row = (array) $row;
        Company::where('id', $companyId)->update([
            'name' => $row['name'] ?? Company::find($companyId)?->name,
            'slug' => $row['slug'] ?? Company::find($companyId)?->slug,
            'is_active' => (bool) ($row['is_active'] ?? true),
        ]);
    }

    private function exportLogoAssets(?CompanySetting $settings): array
    {
        if (!$settings || empty($settings->logo)) {
            return [];
        }

        $logo = (string) $settings->logo;
        if (!str_starts_with($logo, '/storage/')) {
            return [['path' => $logo, 'inline' => $logo]];
        }

        $relative = Str::after($logo, '/storage/');
        $full = storage_path('app/public/'.$relative);
        if (!is_file($full)) {
            return [['path' => $logo, 'missing' => true]];
        }

        return [[
            'path' => $logo,
            'mime' => mime_content_type($full) ?: 'application/octet-stream',
            'content_base64' => base64_encode((string) file_get_contents($full)),
        ]];
    }

    private function restoreLogoAssets(int $companyId, array $assets): void
    {
        if ($assets === []) {
            return;
        }

        foreach ($assets as $asset) {
            $asset = (array) $asset;
            $path = $asset['path'] ?? null;
            if (!$path) {
                continue;
            }
            if (!empty($asset['inline'])) {
                CompanySetting::withoutGlobalScopes()
                    ->where('company_id', $companyId)
                    ->update(['logo' => $asset['inline']]);

                continue;
            }
            if (empty($asset['content_base64'])) {
                continue;
            }

            $relative = Str::after($path, '/storage/');
            $full = storage_path('app/public/'.$relative);
            File::ensureDirectoryExists(dirname($full));
            file_put_contents($full, base64_decode((string) $asset['content_base64']));
            CompanySetting::withoutGlobalScopes()
                ->where('company_id', $companyId)
                ->update(['logo' => $path]);
        }
    }
}

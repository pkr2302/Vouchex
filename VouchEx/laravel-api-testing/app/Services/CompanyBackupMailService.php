<?php

namespace App\Services;

use App\Mail\DailyCompanyBackupsMail;
use App\Models\Company;
use App\Models\CompanySetting;
use App\Models\PortalSetting;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class CompanyBackupMailService
{
    public function __construct(private CompanyBackupService $backups) {}

    /**
     * @param  bool  $manual  True for Settings "Send backup email now (test)" — always sends. False for cron/scheduler — once per calendar day.
     * @return array{ok: bool, message: string, recipients: array<int, string>, company_count: int, skipped?: bool}
     */
    public function sendDailyBackups(bool $manual = false): array
    {
        $recipients = config('vouchex.backup_notify_emails', []);
        if ($recipients === []) {
            return $this->fail('No backup recipients configured. Set VOUCHEX_BACKUP_NOTIFY_EMAILS in .env.');
        }

        if (config('mail.default') === 'log') {
            return $this->fail(
                'MAIL_MAILER is "log" — emails are only written to storage/logs, not sent. Set MAIL_MAILER=smtp and MAIL_* in .env.'
            );
        }

        $timezone = config('vouchex.backup_timezone', 'Asia/Kolkata');
        $runAt = now($timezone);
        $today = $runAt->format('Y-m-d');
        $scheduledTime = config('vouchex.backup_daily_at', '13:00');

        if (! $manual && PortalSetting::scheduledBackupAlreadySentToday($timezone)) {
            $msg = "Scheduled daily backup already sent today ({$today}, {$timezone} at {$scheduledTime}). Skipped duplicate run.";
            Log::info('[VouchEx] '.$msg);

            return [
                'ok' => true,
                'message' => $msg,
                'recipients' => $recipients,
                'company_count' => 0,
                'skipped' => true,
            ];
        }

        $runDate = $runAt->format('d M Y H:i').' IST';
        $trigger = $manual ? 'manual test' : 'scheduled';

        $tempDir = storage_path('app/backup-mail/'.uniqid('daily_', true));
        File::ensureDirectoryExists($tempDir);

        $attachments = [];
        $companies = Company::query()->where('is_active', true)->orderBy('id')->get();

        if ($companies->isEmpty()) {
            File::deleteDirectory($tempDir);

            return $this->fail('No active companies found to back up.');
        }

        try {
            foreach ($companies as $company) {
                $settings = CompanySetting::withoutGlobalScopes()
                    ->where('company_id', $company->id)
                    ->first();
                $name = $settings?->name ?: $company->name;
                $filename = CompanyBackupService::filenameFor($name, $runAt);
                $path = $tempDir.'/'.$filename;
                file_put_contents($path, $this->backups->toJson($company->id));
                $attachments[] = ['path' => $path, 'name' => $filename];
            }

            $sentTo = [];
            foreach ($recipients as $email) {
                Mail::to($email)->send(new DailyCompanyBackupsMail(
                    $runDate,
                    count($attachments),
                    $attachments
                ));
                $sentTo[] = $email;
            }

            $message = "[{$trigger}] Daily backup email sent to ".implode(', ', $sentTo).' ('.count($attachments).' file(s)).';
            Log::info('[VouchEx] '.$message);
            PortalSetting::recordBackupEmailRun(true, $message);
            if (! $manual) {
                PortalSetting::markScheduledBackupSent($timezone);
            }

            return [
                'ok' => true,
                'message' => $message,
                'recipients' => $sentTo,
                'company_count' => count($attachments),
            ];
        } catch (Throwable $e) {
            report($e);
            $message = 'Backup email failed: '.$e->getMessage();
            Log::error('[VouchEx] '.$message, ['exception' => $e]);
            PortalSetting::recordBackupEmailRun(false, $message);

            return $this->fail($message);
        } finally {
            if (File::isDirectory($tempDir)) {
                File::deleteDirectory($tempDir);
            }
        }
    }

    /** @return array{ok: bool, message: string, recipients: array<int, string>, company_count: int} */
    private function fail(string $message): array
    {
        Log::warning('[VouchEx] '.$message);
        PortalSetting::recordBackupEmailRun(false, $message);

        return [
            'ok' => false,
            'message' => $message,
            'recipients' => [],
            'company_count' => 0,
        ];
    }

    /** @return array<string, mixed> */
    public function status(): array
    {
        $row = PortalSetting::record();

        return [
            'schedule' => 'daily at '.config('vouchex.backup_daily_at', '13:00').' ('.config('vouchex.backup_timezone', 'Asia/Kolkata').')',
            'recipients' => config('vouchex.backup_notify_emails', []),
            'mail_driver' => config('mail.default'),
            'last_run_at' => $row->last_backup_email_at?->toIso8601String(),
            'last_run_ok' => $row->last_backup_email_ok,
            'last_run_message' => $row->last_backup_email_message,
            'last_scheduled_on' => $row->last_scheduled_backup_on,
        ];
    }
}

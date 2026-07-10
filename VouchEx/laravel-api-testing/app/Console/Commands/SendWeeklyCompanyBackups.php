<?php

namespace App\Console\Commands;

use App\Mail\WeeklyCompanyBackupsMail;
use App\Models\Company;
use App\Models\CompanySetting;
use App\Services\CompanyBackupService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;

class SendWeeklyCompanyBackups extends Command
{
    protected $signature = 'backups:send-weekly';

    protected $description = 'Email weekly JSON backups (one file per active company) to configured super-admin addresses';

    public function handle(CompanyBackupService $backups): int
    {
        $recipients = config('vouchex.backup_notify_emails', []);
        if ($recipients === []) {
            $this->warn('No backup_notify_emails configured.');

            return self::FAILURE;
        }

        $runAt = now(config('vouchex.backup_timezone', 'Asia/Kolkata'));
        $runDate = $runAt->format('d M Y');
        $tempDir = storage_path('app/backup-mail/'.uniqid('weekly_', true));
        File::ensureDirectoryExists($tempDir);

        $attachments = [];
        $companies = Company::query()->where('is_active', true)->orderBy('id')->get();

        foreach ($companies as $company) {
            $settings = CompanySetting::withoutGlobalScopes()
                ->where('company_id', $company->id)
                ->first();
            $name = $settings?->name ?: $company->name;
            $filename = CompanyBackupService::filenameFor($name, $runAt);
            $path = $tempDir.'/'.$filename;
            file_put_contents($path, $backups->toJson($company->id));
            $attachments[] = ['path' => $path, 'name' => $filename];
        }

        try {
            Mail::to($recipients)->send(new WeeklyCompanyBackupsMail(
                $runDate,
                count($attachments),
                $attachments
            ));
            $this->info('Weekly backups emailed to: '.implode(', ', $recipients));
        } catch (\Throwable $e) {
            report($e);
            $this->error($e->getMessage());

            return self::FAILURE;
        } finally {
            File::deleteDirectory($tempDir);
        }

        return self::SUCCESS;
    }
}

<?php

namespace App\Console\Commands;

use App\Services\CompanyBackupMailService;
use Illuminate\Console\Command;

class SendDailyCompanyBackups extends Command
{
    protected $signature = 'backups:send-daily';

    protected $description = 'Email daily JSON backups (one file per active company) to configured super-admin addresses';

    public function handle(CompanyBackupMailService $mailer): int
    {
        $result = $mailer->sendDailyBackups(manual: false);

        if (! empty($result['skipped'])) {
            $this->info($result['message']);

            return self::SUCCESS;
        }

        if ($result['ok']) {
            $this->info($result['message']);

            return self::SUCCESS;
        }

        $this->error($result['message']);

        return self::FAILURE;
    }
}

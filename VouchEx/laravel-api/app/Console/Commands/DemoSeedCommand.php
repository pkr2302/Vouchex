<?php

namespace App\Console\Commands;

use Database\Seeders\DemoCompaniesSeeder;
use Illuminate\Console\Command;

class DemoSeedCommand extends Command
{
    protected $signature = 'demo:seed {--fresh : Delete existing Vouchex AS / Ind AS demo companies first}';

    protected $description = 'Seed Vouchex AS and Vouchex Ind AS demo companies with full transaction sets and GL backfill';

    public function handle(): int
    {
        $seeder = app(DemoCompaniesSeeder::class);

        if ($this->option('fresh')) {
            $this->warn('Removing existing demo companies (vouchex-as, vouchex-ind-as)...');
            $seeder->removeDemoCompanies();
        }

        $this->info('Seeding demo companies...');
        $result = $seeder->seed();

        foreach ($result as $row) {
            $this->line(sprintf(
                '  %s (id %d) — framework %s — admin %s / user123',
                $row['name'],
                $row['company_id'],
                $row['framework'],
                $row['admin_email']
            ));
            if (! empty($row['backfill_errors'])) {
                $this->error('  GL backfill had errors: '.json_encode($row['backfill_errors']));
            } else {
                $this->info('  GL backfill OK');
            }
        }

        $this->newLine();
        $this->info('Demo companies ready. Log in as admin-as@vouchex.com or admin-indas@vouchex.com (password: user123).');

        return self::SUCCESS;
    }
}

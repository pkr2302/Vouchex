<?php

namespace App\Console\Commands;

use App\Services\GlBackfillService;
use App\Support\TenantContext;
use Illuminate\Console\Command;

class GlBackfillCommand extends Command
{
    protected $signature = 'gl:backfill {company_id? : Optional company id}';

    protected $description = 'Backfill GL journals from existing operational documents (no data loss)';

    public function handle(GlBackfillService $backfill): int
    {
        $companyId = $this->argument('company_id');

        if ($companyId) {
            TenantContext::setCompany((int) $companyId);
            $counts = $backfill->backfillCompany((int) $companyId);
            $this->info('Backfill complete for company '.$companyId.': '.json_encode($counts));
            if (! empty($counts['errors'])) {
                $this->error('Some records failed — see errors array above.');

                return self::FAILURE;
            }

            return self::SUCCESS;
        }

        $summary = $backfill->backfillAll();
        foreach ($summary as $id => $counts) {
            $this->info("Company {$id}: ".json_encode($counts));
        }

        return self::SUCCESS;
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $loginKeep = DB::table('login_logs')->orderByDesc('id')->limit(10)->pluck('id');
        if ($loginKeep->isNotEmpty()) {
            DB::table('login_logs')->whereNotIn('id', $loginKeep)->delete();
        }

        $auditKeep = DB::table('audit_logs')->orderByDesc('id')->limit(20)->pluck('id');
        if ($auditKeep->isNotEmpty()) {
            DB::table('audit_logs')->whereNotIn('id', $auditKeep)->delete();
        }
    }

    public function down(): void
    {
        // Retention trim is not reversible.
    }
};

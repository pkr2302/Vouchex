<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('invoices', 'export_treatment')) {
                $col = $table->string('export_treatment', 60)->nullable();
                if (Schema::hasColumn('invoices', 'export_country')) {
                    $col->after('export_country');
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (Schema::hasColumn('invoices', 'export_treatment')) {
                $table->dropColumn('export_treatment');
            }
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('company_settings', 'upi_id')) {
            return;
        }

        Schema::table('company_settings', function (Blueprint $table) {
            $table->string('upi_id')->nullable()->after('bank_branch');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('company_settings', 'upi_id')) {
            return;
        }

        Schema::table('company_settings', function (Blueprint $table) {
            $table->dropColumn('upi_id');
        });
    }
};

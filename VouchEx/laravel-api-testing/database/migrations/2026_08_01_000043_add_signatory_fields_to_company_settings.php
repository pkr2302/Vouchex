<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('company_settings')) {
            return;
        }

        Schema::table('company_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('company_settings', 'signatory_name')) {
                $table->string('signatory_name')->nullable()->after('bank_branch');
            }
            if (! Schema::hasColumn('company_settings', 'signature_image')) {
                $table->string('signature_image', 500)->nullable()->after('signatory_name');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('company_settings')) {
            return;
        }

        Schema::table('company_settings', function (Blueprint $table) {
            if (Schema::hasColumn('company_settings', 'signature_image')) {
                $table->dropColumn('signature_image');
            }
            if (Schema::hasColumn('company_settings', 'signatory_name')) {
                $table->dropColumn('signatory_name');
            }
        });
    }
};

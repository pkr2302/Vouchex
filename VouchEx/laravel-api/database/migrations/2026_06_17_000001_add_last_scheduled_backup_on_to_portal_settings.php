<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('portal_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('portal_settings', 'last_scheduled_backup_on')) {
                $table->string('last_scheduled_backup_on', 10)->nullable()->after('last_backup_email_message');
            }
        });
    }

    public function down(): void
    {
        Schema::table('portal_settings', function (Blueprint $table) {
            if (Schema::hasColumn('portal_settings', 'last_scheduled_backup_on')) {
                $table->dropColumn('last_scheduled_backup_on');
            }
        });
    }
};

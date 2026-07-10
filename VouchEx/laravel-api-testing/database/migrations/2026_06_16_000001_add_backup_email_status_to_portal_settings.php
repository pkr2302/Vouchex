<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('portal_settings', function (Blueprint $table) {
            $table->timestamp('last_backup_email_at')->nullable()->after('inactivity_timeout');
            $table->boolean('last_backup_email_ok')->nullable()->after('last_backup_email_at');
            $table->text('last_backup_email_message')->nullable()->after('last_backup_email_ok');
        });
    }

    public function down(): void
    {
        Schema::table('portal_settings', function (Blueprint $table) {
            $table->dropColumn(['last_backup_email_at', 'last_backup_email_ok', 'last_backup_email_message']);
        });
    }
};

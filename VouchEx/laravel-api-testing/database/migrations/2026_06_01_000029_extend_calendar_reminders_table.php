<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calendar_reminders', function (Blueprint $table) {
            $table->string('priority', 1)->default('B')->after('kind');
            $table->boolean('is_recurring')->default(false)->after('notify_email');
            $table->string('recurring_frequency')->nullable()->after('is_recurring');
            $table->timestamp('popup_shown_at')->nullable()->after('email_error');
            $table->timestamp('last_occurrence_sent_at')->nullable()->after('popup_shown_at');
        });
    }

    public function down(): void
    {
        Schema::table('calendar_reminders', function (Blueprint $table) {
            $table->dropColumn([
                'priority',
                'is_recurring',
                'recurring_frequency',
                'popup_shown_at',
                'last_occurrence_sent_at',
            ]);
        });
    }
};

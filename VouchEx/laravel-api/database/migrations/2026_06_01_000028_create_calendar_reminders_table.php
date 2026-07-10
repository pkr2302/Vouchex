<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind', 20)->default('reminder');
            $table->string('title');
            $table->text('notes')->nullable();
            $table->date('reminder_date');
            $table->string('reminder_time', 5)->default('09:00');
            $table->string('notify_email');
            $table->string('email_status', 20)->default('pending');
            $table->timestamp('email_sent_at')->nullable();
            $table->text('email_error')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'reminder_date']);
            $table->index(['email_status', 'email_sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_reminders');
    }
};

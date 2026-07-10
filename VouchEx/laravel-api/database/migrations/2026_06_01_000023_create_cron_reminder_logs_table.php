<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cron_reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('expense_number')->nullable();
            $table->string('vendor_name')->nullable();
            $table->date('due_date')->nullable();
            $table->date('scheduled_date')->nullable();
            $table->string('type')->nullable();
            $table->string('recipient')->nullable();
            $table->string('status')->nullable();
            $table->timestamp('logged_at')->useCurrent();
            $table->timestamps();

            $table->index(['company_id', 'logged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cron_reminder_logs');
    }
};

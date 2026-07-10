<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ecrs_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('action')->default('REVERSAL');
            $table->string('type');
            $table->decimal('cgst', 15, 2)->default(0);
            $table->decimal('sgst', 15, 2)->default(0);
            $table->decimal('igst', 15, 2)->default(0);
            $table->string('status')->default('Reversed');
            $table->timestamp('logged_at')->useCurrent();
            $table->timestamps();

            $table->index(['company_id', 'logged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ecrs_logs');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('payment_number');
            $table->foreignId('expense_id')->nullable()->constrained('expenses')->nullOnDelete();
            $table->string('expense_number')->nullable();
            $table->string('payee')->nullable();
            $table->date('payment_date');
            $table->decimal('amount_paid', 15, 2)->default(0);
            $table->decimal('tds_deducted', 15, 2)->default(0);
            $table->string('payment_mode')->nullable();
            $table->string('paid_from')->nullable();
            $table->string('reference_no')->nullable();
            $table->boolean('is_advance')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'payment_number']);
            $table->index(['company_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};

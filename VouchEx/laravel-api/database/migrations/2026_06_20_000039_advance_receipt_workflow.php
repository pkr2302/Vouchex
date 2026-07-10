<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('receipts', function (Blueprint $table) {
            $table->string('advance_reference', 64)->nullable()->after('receipt_number');
            $table->string('utr_number', 100)->nullable()->after('reference_no');
            $table->string('cheque_number', 100)->nullable()->after('utr_number');
            $table->string('bank_reference', 100)->nullable()->after('cheque_number');
            $table->string('customer_reference', 100)->nullable()->after('bank_reference');
            $table->unique(['company_id', 'advance_reference'], 'receipts_company_advance_ref_unique');
        });

        Schema::create('advance_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('advance_receipt_id')->constrained('receipts')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->decimal('adjustment_amount', 15, 2);
            $table->date('adjustment_date');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['company_id', 'advance_receipt_id']);
            $table->index(['company_id', 'invoice_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('advance_adjustments');

        Schema::table('receipts', function (Blueprint $table) {
            $table->dropUnique('receipts_company_advance_ref_unique');
            $table->dropColumn([
                'advance_reference',
                'utr_number',
                'cheque_number',
                'bank_reference',
                'customer_reference',
            ]);
        });
    }
};

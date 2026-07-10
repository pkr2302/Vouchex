<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('expense_number');
            $table->string('invoice_number')->nullable();
            $table->text('description')->nullable();
            $table->string('expense_head')->nullable();
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->string('vendor_name')->nullable();
            $table->date('expense_date');
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('cgst', 15, 2)->default(0);
            $table->decimal('sgst', 15, 2)->default(0);
            $table->decimal('igst', 15, 2)->default(0);
            $table->decimal('payable_tax', 15, 2)->default(0);
            $table->string('supply_mechanism', 8)->default('FCM');
            $table->string('place_of_supply')->nullable();
            $table->enum('payment_status', ['Unpaid', 'Partially Paid', 'Paid'])->default('Unpaid');
            $table->string('hsn_sac')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->string('recurring_frequency')->nullable();
            $table->boolean('reminders_opt_in')->default(false);
            $table->boolean('itc_eligible')->default(true);
            $table->decimal('tds_deducted', 15, 2)->default(0);
            $table->string('attachment')->nullable();
            $table->date('due_date')->nullable();
            $table->string('paid_from_account')->nullable();
            $table->string('payment_reference')->nullable();
            $table->foreignId('product_id')->nullable()->constrained('inventories')->nullOnDelete();
            $table->decimal('quantity_purchased', 15, 3)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'expense_number']);
            $table->unique(['company_id', 'vendor_id', 'invoice_number'], 'expenses_company_vendor_invoice_unique');
            $table->index(['company_id', 'expense_date']);
            $table->index(['company_id', 'payment_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};

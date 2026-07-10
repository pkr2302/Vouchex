<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->enum('type', ['Product', 'Service'])->default('Product');
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('sku')->nullable();
            $table->integer('quantity')->default(0);
            $table->string('unit')->default('Unit');
            $table->decimal('rate', 15, 2)->default(0);
            $table->decimal('purchase_price', 15, 2)->default(0);
            $table->decimal('sales_price', 15, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(18);
            $table->string('supply_mechanism', 8)->default('FCM');
            $table->integer('opening_stock')->default(0);
            $table->integer('low_stock_threshold')->default(50);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'name']);
            $table->index(['company_id', 'sku']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventories');
    }
};

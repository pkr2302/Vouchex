<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_note_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('credit_note_id')->constrained('credit_notes')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('inventories')->nullOnDelete();
            $table->string('description')->nullable();
            $table->string('item_detail')->nullable();
            $table->decimal('quantity', 15, 3)->default(1);
            $table->decimal('original_qty', 15, 3)->nullable();
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('original_rate', 15, 2)->nullable();
            $table->decimal('line_total', 15, 2)->default(0);
            $table->string('hsn_sac')->nullable();
            $table->decimal('tax_rate_override', 5, 2)->nullable();
            $table->string('supply_mechanism', 8)->default('FCM');
            $table->decimal('cgst', 15, 2)->default(0);
            $table->decimal('sgst', 15, 2)->default(0);
            $table->decimal('igst', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_note_items');
    }
};

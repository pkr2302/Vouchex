<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->unique()->constrained('companies')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->string('gstin', 15)->nullable();
            $table->string('pan', 10)->nullable();
            $table->string('state')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('pincode', 10)->nullable();
            $table->string('country')->default('India');
            $table->string('email')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('currency', 8)->default('INR');
            $table->string('bank_name')->nullable();
            $table->string('bank_account')->nullable();
            $table->string('bank_ifsc')->nullable();
            $table->string('bank_branch')->nullable();
            $table->longText('logo')->nullable();
            $table->boolean('is_financial_year_locked')->default(false);
            $table->json('locked_months')->nullable();
            $table->unsignedInteger('inactivity_timeout')->default(900);
            $table->decimal('rcm_ledger_balance', 15, 2)->default(0);
            $table->json('custom_options')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_settings');
    }
};

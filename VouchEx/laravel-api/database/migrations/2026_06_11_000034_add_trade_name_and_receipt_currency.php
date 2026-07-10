<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('company_settings', 'trade_name')) {
                $table->string('trade_name')->nullable()->after('name');
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'conversion_rate')) {
                $table->dropColumn('conversion_rate');
            }
            if (Schema::hasColumn('payments', 'currency')) {
                $table->dropColumn('currency');
            }
        });

        Schema::table('receipts', function (Blueprint $table) {
            if (! Schema::hasColumn('receipts', 'currency')) {
                $table->string('currency', 10)->default('INR')->after('amount_received');
            }
            if (! Schema::hasColumn('receipts', 'conversion_rate')) {
                $table->decimal('conversion_rate', 18, 6)->nullable()->after('currency');
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'currency')) {
                $table->string('currency', 10)->default('INR')->after('amount_paid');
            }
            if (! Schema::hasColumn('payments', 'conversion_rate')) {
                $table->decimal('conversion_rate', 18, 6)->nullable()->after('currency');
            }
        });

        Schema::create('currency_conversions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->date('conversion_date');
            $table->string('from_currency', 10);
            $table->string('to_currency', 10)->default('INR');
            $table->decimal('from_amount', 18, 2);
            $table->decimal('to_amount', 18, 2);
            $table->decimal('conversion_rate', 18, 6);
            $table->string('from_ledger', 255)->nullable();
            $table->string('to_ledger', 255)->nullable();
            $table->string('reference_no', 100)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'conversion_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('currency_conversions');

        Schema::table('receipts', function (Blueprint $table) {
            if (Schema::hasColumn('receipts', 'conversion_rate')) {
                $table->dropColumn('conversion_rate');
            }
            if (Schema::hasColumn('receipts', 'currency')) {
                $table->dropColumn('currency');
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'conversion_rate')) {
                $table->dropColumn('conversion_rate');
            }
            if (Schema::hasColumn('payments', 'currency')) {
                $table->dropColumn('currency');
            }
        });

        Schema::table('company_settings', function (Blueprint $table) {
            if (Schema::hasColumn('company_settings', 'trade_name')) {
                $table->dropColumn('trade_name');
            }
        });
    }
};

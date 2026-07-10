<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('currency_conversions', function (Blueprint $table) {
            if (! Schema::hasColumn('currency_conversions', 'invoice_id')) {
                $table->unsignedBigInteger('invoice_id')->nullable()->after('company_id');
                $table->string('invoice_number', 100)->nullable()->after('invoice_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('currency_conversions', function (Blueprint $table) {
            if (Schema::hasColumn('currency_conversions', 'invoice_number')) {
                $table->dropColumn('invoice_number');
            }
            if (Schema::hasColumn('currency_conversions', 'invoice_id')) {
                $table->dropColumn('invoice_id');
            }
        });
    }
};

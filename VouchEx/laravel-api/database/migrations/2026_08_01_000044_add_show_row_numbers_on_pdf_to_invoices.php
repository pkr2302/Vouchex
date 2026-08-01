<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('invoices', 'show_row_numbers_on_pdf')) {
                $table->boolean('show_row_numbers_on_pdf')->default(false)->after('print_place_of_supply_on_pdf');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (Schema::hasColumn('invoices', 'show_row_numbers_on_pdf')) {
                $table->dropColumn('show_row_numbers_on_pdf');
            }
        });
    }
};

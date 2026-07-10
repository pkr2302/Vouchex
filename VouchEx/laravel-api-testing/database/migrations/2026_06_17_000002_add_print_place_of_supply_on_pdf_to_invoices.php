<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('invoices', 'print_place_of_supply_on_pdf')) {
                $table->boolean('print_place_of_supply_on_pdf')->default(true)->after('place_of_supply');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (Schema::hasColumn('invoices', 'print_place_of_supply_on_pdf')) {
                $table->dropColumn('print_place_of_supply_on_pdf');
            }
        });
    }
};

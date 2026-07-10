<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function addCurrencyColumns(string $tableName, ?string $after = null): void
    {
        Schema::table($tableName, function (Blueprint $table) use ($tableName, $after) {
            if (! Schema::hasColumn($tableName, 'currency')) {
                $col = $table->string('currency', 8)->default('INR');
                if ($after && Schema::hasColumn($tableName, $after)) {
                    $col->after($after);
                }
            }
            if (! Schema::hasColumn($tableName, 'export_country')) {
                $col = $table->string('export_country', 120)->nullable();
                if (Schema::hasColumn($tableName, 'currency')) {
                    $col->after('currency');
                }
            }
            if (! Schema::hasColumn($tableName, 'conversion_rate')) {
                $col = $table->decimal('conversion_rate', 12, 6)->default(1);
                if (Schema::hasColumn($tableName, 'export_country')) {
                    $col->after('export_country');
                }
            }
        });
    }

    public function up(): void
    {
        $this->addCurrencyColumns('invoices', 'place_of_supply');
        $this->addCurrencyColumns('expenses', 'place_of_supply');
        $this->addCurrencyColumns('credit_notes', 'supply_mechanism');
        $this->addCurrencyColumns('debit_notes', 'supply_mechanism');

        Schema::table('vendors', function (Blueprint $table) {
            if (! Schema::hasColumn('vendors', 'category')) {
                $table->string('category', 50)->nullable()->after('phone');
            }
            if (! Schema::hasColumn('vendors', 'gst_type')) {
                $table->string('gst_type', 100)->nullable()->after('category');
            }
            if (! Schema::hasColumn('vendors', 'gstin')) {
                $table->string('gstin', 20)->nullable()->after('gst_type');
            }
            if (! Schema::hasColumn('vendors', 'currency')) {
                $table->string('currency', 8)->default('INR')->after('gstin');
            }
            if (! Schema::hasColumn('vendors', 'billing_city')) {
                $table->string('billing_city', 100)->nullable()->after('billing_address');
            }
            if (! Schema::hasColumn('vendors', 'billing_state')) {
                $table->string('billing_state', 100)->nullable()->after('billing_city');
            }
            if (! Schema::hasColumn('vendors', 'billing_pincode')) {
                $table->string('billing_pincode', 20)->nullable()->after('billing_state');
            }
            if (! Schema::hasColumn('vendors', 'billing_country')) {
                $table->string('billing_country', 100)->nullable()->default('India')->after('billing_pincode');
            }
            if (! Schema::hasColumn('vendors', 'payment_terms')) {
                $table->string('payment_terms', 100)->nullable()->after('opening_balance');
            }
            if (! Schema::hasColumn('vendors', 'opening_balance_date')) {
                $table->date('opening_balance_date')->nullable()->after('payment_terms');
            }
        });
    }

    public function down(): void
    {
        foreach (['invoices', 'expenses', 'credit_notes', 'debit_notes'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                foreach (['conversion_rate', 'export_country', 'currency'] as $col) {
                    if (Schema::hasColumn($tableName, $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        Schema::table('vendors', function (Blueprint $table) {
            foreach ([
                'opening_balance_date', 'payment_terms', 'billing_country', 'billing_pincode',
                'billing_state', 'billing_city', 'currency', 'gstin', 'gst_type', 'category',
            ] as $col) {
                if (Schema::hasColumn('vendors', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

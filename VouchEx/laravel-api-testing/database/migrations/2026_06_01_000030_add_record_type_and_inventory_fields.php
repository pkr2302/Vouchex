<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('expenses') && ! Schema::hasColumn('expenses', 'record_type')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->string('record_type', 16)->default('expense')->after('expense_number');
            });
        }

        if (Schema::hasTable('inventories') && ! Schema::hasColumn('inventories', 'product_class')) {
            Schema::table('inventories', function (Blueprint $table) {
                $table->string('product_class', 32)->default('finished_goods')->after('type');
                $table->string('default_expense_head')->nullable()->after('product_class');
            });
        }

        if (! Schema::hasTable('consumptions')) {
            Schema::create('consumptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $table->string('consumption_number');
                $table->date('consumption_date');
                $table->foreignId('product_id')->constrained('inventories')->cascadeOnDelete();
                $table->decimal('quantity', 15, 3);
                $table->decimal('unit_cost', 15, 2)->default(0);
                $table->decimal('total_value', 15, 2)->default(0);
                $table->string('expense_head')->nullable();
                $table->text('reference')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['company_id', 'consumption_number']);
                $table->index(['company_id', 'consumption_date']);
            });
        }

        foreach (['bank_ledgers', 'cash_ledgers', 'expense_heads'] as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                if (! Schema::hasColumn($table, 'account_code')) {
                    $blueprint->string('account_code', 32)->nullable();
                }
                if (! Schema::hasColumn($table, 'ledger_type')) {
                    $blueprint->string('ledger_type', 32)->nullable();
                }
                if (! Schema::hasColumn($table, 'opening_balance')) {
                    $blueprint->decimal('opening_balance', 15, 2)->default(0);
                }
                if (! Schema::hasColumn($table, 'opening_balance_date')) {
                    $blueprint->date('opening_balance_date')->nullable();
                }
                if (! Schema::hasColumn($table, 'description')) {
                    $blueprint->text('description')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('consumptions');

        if (Schema::hasTable('expenses') && Schema::hasColumn('expenses', 'record_type')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->dropColumn('record_type');
            });
        }

        if (Schema::hasTable('inventories') && Schema::hasColumn('inventories', 'product_class')) {
            Schema::table('inventories', function (Blueprint $table) {
                $table->dropColumn(['product_class', 'default_expense_head']);
            });
        }
    }
};

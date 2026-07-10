<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('report_groups')->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 64)->nullable();
            $table->string('statement_type', 32)->default('balance_sheet');
            $table->string('nature', 32)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_system')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['company_id', 'parent_id']);
            $table->index(['company_id', 'statement_type']);
        });

        Schema::table('gl_accounts', function (Blueprint $table) {
            $table->string('account_subtype', 64)->nullable()->after('account_group');
            $table->decimal('opening_balance', 15, 2)->default(0)->after('active');
            $table->date('opening_balance_date')->nullable()->after('opening_balance');
            $table->string('normal_balance_side', 8)->default('debit')->after('opening_balance_date');
            $table->foreignId('report_group_id')->nullable()->after('normal_balance_side')
                ->constrained('report_groups')->nullOnDelete();
            $table->text('description')->nullable()->after('report_group_id');
            $table->json('metadata')->nullable()->after('description');
        });

        Schema::table('bank_ledgers', function (Blueprint $table) {
            $table->string('ifsc', 20)->nullable()->after('description');
            $table->string('account_number', 50)->nullable()->after('ifsc');
            $table->string('branch', 255)->nullable()->after('account_number');
            $table->string('account_subtype', 64)->default('bank')->after('ledger_type');
        });

        Schema::table('cash_ledgers', function (Blueprint $table) {
            $table->string('location', 255)->nullable()->after('description');
            $table->string('account_subtype', 64)->default('cash')->after('ledger_type');
        });

        Schema::table('expense_heads', function (Blueprint $table) {
            $table->boolean('active')->default(true)->after('description');
            $table->string('account_subtype', 64)->default('expense_indirect')->after('ledger_type');
        });

        Schema::table('company_settings', function (Blueprint $table) {
            $table->string('accounting_framework', 16)->default('AS')->after('gl_backfilled_at');
        });
    }

    public function down(): void
    {
        Schema::table('company_settings', function (Blueprint $table) {
            $table->dropColumn('accounting_framework');
        });

        Schema::table('expense_heads', function (Blueprint $table) {
            $table->dropColumn(['active', 'account_subtype']);
        });

        Schema::table('cash_ledgers', function (Blueprint $table) {
            $table->dropColumn(['location', 'account_subtype']);
        });

        Schema::table('bank_ledgers', function (Blueprint $table) {
            $table->dropColumn(['ifsc', 'account_number', 'branch', 'account_subtype']);
        });

        Schema::table('gl_accounts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('report_group_id');
            $table->dropColumn([
                'account_subtype',
                'opening_balance',
                'opening_balance_date',
                'normal_balance_side',
                'description',
                'metadata',
            ]);
        });

        Schema::dropIfExists('report_groups');
    }
};

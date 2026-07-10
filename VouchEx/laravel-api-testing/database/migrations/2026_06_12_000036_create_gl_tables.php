<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gl_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('code', 64);
            $table->string('name');
            $table->string('account_type', 16); // asset, liability, income, expense, equity
            $table->string('account_group', 32)->default('system'); // system, customer, vendor, bank, cash, expense, inventory, gst
            $table->string('ref_type', 64)->nullable();
            $table->unsignedBigInteger('ref_id')->nullable();
            $table->boolean('is_system')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'account_type']);
            $table->index(['company_id', 'ref_type', 'ref_id']);
        });

        Schema::create('gl_journals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('journal_number', 64);
            $table->date('journal_date');
            $table->string('source_type', 32);
            $table->unsignedBigInteger('source_id')->nullable();
            $table->foreignId('reversal_of_journal_id')->nullable()->constrained('gl_journals')->nullOnDelete();
            $table->boolean('is_reversal')->default(false);
            $table->string('memo')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'journal_number']);
            $table->index(['company_id', 'journal_date']);
            $table->index(['company_id', 'source_type', 'source_id']);
        });

        Schema::create('gl_journal_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('journal_id')->constrained('gl_journals')->cascadeOnDelete();
            $table->foreignId('gl_account_id')->constrained('gl_accounts')->cascadeOnDelete();
            $table->string('account_code', 64);
            $table->string('account_name');
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->string('line_memo')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'gl_account_id']);
            $table->index(['journal_id']);
        });

        if (Schema::hasTable('currency_conversions') && ! Schema::hasColumn('currency_conversions', 'from_book_amount_inr')) {
            Schema::table('currency_conversions', function (Blueprint $table) {
                $table->decimal('from_book_amount_inr', 15, 2)->nullable()->after('from_amount');
            });
        }

        if (Schema::hasTable('company_settings') && ! Schema::hasColumn('company_settings', 'gl_seeded_at')) {
            Schema::table('company_settings', function (Blueprint $table) {
                $table->timestamp('gl_seeded_at')->nullable()->after('rcm_ledger_balance');
                $table->timestamp('gl_backfilled_at')->nullable()->after('gl_seeded_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('company_settings') && Schema::hasColumn('company_settings', 'gl_backfilled_at')) {
            Schema::table('company_settings', function (Blueprint $table) {
                $table->dropColumn(['gl_seeded_at', 'gl_backfilled_at']);
            });
        }

        if (Schema::hasTable('currency_conversions') && Schema::hasColumn('currency_conversions', 'from_book_amount_inr')) {
            Schema::table('currency_conversions', function (Blueprint $table) {
                $table->dropColumn('from_book_amount_inr');
            });
        }

        Schema::dropIfExists('gl_journal_lines');
        Schema::dropIfExists('gl_journals');
        Schema::dropIfExists('gl_accounts');
    }
};

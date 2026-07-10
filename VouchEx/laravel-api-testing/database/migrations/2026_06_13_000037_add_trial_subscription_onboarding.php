<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'user', 'trial_owner') NOT NULL DEFAULT 'user'");

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'google_id')) {
                $table->string('google_id', 64)->nullable()->unique()->after('email');
            }
            if (! Schema::hasColumn('users', 'auth_provider')) {
                $table->string('auth_provider', 16)->default('local')->after('google_id');
            }
            if (! Schema::hasColumn('users', 'onboarding_step')) {
                $table->string('onboarding_step', 32)->nullable()->after('auth_provider');
            }
            if (! Schema::hasColumn('users', 'password_set')) {
                $table->boolean('password_set')->default(true)->after('onboarding_step');
            }
        });

        Schema::table('companies', function (Blueprint $table) {
            if (! Schema::hasColumn('companies', 'owner_user_id')) {
                $table->foreignId('owner_user_id')->nullable()->after('is_active')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('companies', 'subscription_status')) {
                $table->string('subscription_status', 24)->default('none')->after('owner_user_id');
            }
            if (! Schema::hasColumn('companies', 'subscription_plan')) {
                $table->string('subscription_plan', 32)->nullable()->after('subscription_status');
            }
            if (! Schema::hasColumn('companies', 'trial_ends_at')) {
                $table->timestamp('trial_ends_at')->nullable()->after('subscription_plan');
            }
            if (! Schema::hasColumn('companies', 'subscription_ends_at')) {
                $table->timestamp('subscription_ends_at')->nullable()->after('trial_ends_at');
            }
        });

        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('plan', 32);
            $table->decimal('amount', 10, 2);
            $table->string('payment_reference', 100)->nullable();
            $table->string('status', 24)->default('pending');
            $table->text('notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');

        Schema::table('companies', function (Blueprint $table) {
            foreach (['subscription_ends_at', 'trial_ends_at', 'subscription_plan', 'subscription_status', 'owner_user_id'] as $col) {
                if (Schema::hasColumn('companies', $col)) {
                    if ($col === 'owner_user_id') {
                        $table->dropForeign(['owner_user_id']);
                    }
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('users', function (Blueprint $table) {
            foreach (['password_set', 'onboarding_step', 'auth_provider', 'google_id'] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'user') NOT NULL DEFAULT 'user'");
    }
};

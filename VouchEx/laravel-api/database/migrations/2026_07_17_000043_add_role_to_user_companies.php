<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_companies')) {
            return;
        }

        Schema::table('user_companies', function (Blueprint $table) {
            if (! Schema::hasColumn('user_companies', 'role')) {
                $table->string('role', 32)->nullable()->after('company_id');
            }
        });

        // Backfill from the user's global role (admin/user only).
        if (Schema::hasTable('users') && Schema::hasColumn('user_companies', 'role')) {
            DB::table('user_companies')
                ->join('users', 'users.id', '=', 'user_companies.user_id')
                ->whereNull('user_companies.role')
                ->update([
                    'user_companies.role' => DB::raw("CASE WHEN users.role = 'admin' THEN 'admin' ELSE 'user' END"),
                ]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('user_companies') || ! Schema::hasColumn('user_companies', 'role')) {
            return;
        }

        Schema::table('user_companies', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};

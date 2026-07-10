<?php

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_companies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'company_id']);
        });

        if (! Schema::hasTable('users') || ! Schema::hasTable('companies')) {
            return;
        }

        User::query()
            ->where('role', 'group_admin')
            ->get()
            ->each(function (User $user) {
                $ownedIds = Company::query()
                    ->where('owner_user_id', $user->id)
                    ->pluck('id')
                    ->all();
                if ($ownedIds !== []) {
                    $user->managedCompanies()->syncWithoutDetaching($ownedIds);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_companies');
    }
};

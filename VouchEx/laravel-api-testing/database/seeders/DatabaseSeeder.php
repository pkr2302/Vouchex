<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! User::where('email', 'admin@vouchex.com')->exists()) {
            User::create([
                'company_id' => null,
                'email' => 'admin@vouchex.com',
                'name' => 'Portal Super Admin',
                'role' => 'super_admin',
                'password' => Hash::make('user123'),
                'is_active' => true,
            ]);
        }

        $this->call(DemoCompaniesSeeder::class);
    }
}

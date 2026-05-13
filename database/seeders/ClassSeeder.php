<?php

namespace Database\Seeders;

use App\Models\ClassRoom;
use Illuminate\Database\Seeder;

class ClassSeeder extends Seeder
{
    public function run(): void
    {
        foreach (range(1, 6) as $grade) {
            ClassRoom::firstOrCreate(['name' => "Kelas {$grade}"]);
        }
    }
}

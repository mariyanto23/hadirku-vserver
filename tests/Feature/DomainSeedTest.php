<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\ClassRoom;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DomainSeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_classes_and_settings_are_seeded(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(6, ClassRoom::count());
        $this->assertNotNull(AppSetting::where('key', 'attendance')->first());
        $this->assertNotNull(AppSetting::where('key', 'site')->first());
    }
}

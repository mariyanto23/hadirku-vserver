<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_admin_can_login_and_read_me(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->postJson('/api/auth/login', [
            'email' => 'sdn01jatipurwo@gmail.com',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('data.role', 'admin');

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'sdn01jatipurwo@gmail.com');
    }

    public function test_invalid_login_is_rejected(): void
    {
        User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => Hash::make('password'),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'admin@example.test',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }
}

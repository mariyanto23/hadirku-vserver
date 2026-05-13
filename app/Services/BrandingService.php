<?php

namespace App\Services;

use App\Models\AppSetting;

class BrandingService
{
    public function manifest(): array
    {
        $site = AppSetting::where('key', 'site')->first()?->value ?? [];
        $school = AppSetting::where('key', 'school')->first()?->value ?? [];
        $logo = $school['schoolLogo'] ?? null;

        return [
            'name' => $site['appSubtitle'] ?? 'SD N 01 Jatipurwo',
            'short_name' => $site['appTitle'] ?? 'Sistem Presensi',
            'description' => $site['appSubtitle'] ?? 'Sistem Presensi Wajah',
            'theme_color' => '#2563eb',
            'background_color' => '#ffffff',
            'display' => 'standalone',
            'orientation' => 'portrait',
            'scope' => '/',
            'start_url' => '/',
            'icons' => $logo
                ? [
                    ['src' => $logo, 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
                    ['src' => $logo, 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any maskable'],
                ]
                : [
                    ['src' => '/pwa-192x192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
                    ['src' => '/pwa-512x512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any maskable'],
                ],
        ];
    }
}

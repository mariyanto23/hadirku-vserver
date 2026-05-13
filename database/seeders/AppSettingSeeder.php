<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use Illuminate\Database\Seeder;

class AppSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'attendance' => [
                'attendanceStart' => '06:00',
                'lateThreshold' => '07:05',
                'attendanceEnd' => '12:00',
                'timezone' => 'Asia/Jakarta',
                'cooldownSeconds' => 5,
                'enableSelfAttendance' => false,
                'schoolDays' => 5,
            ],
            'camera' => [
                'cameraResolution' => '720p',
                'autoCapture' => true,
                'captureDelay' => '1',
            ],
            'notifications' => [
                'enableSound' => true,
                'enableNotifications' => true,
                'notifyLateStudents' => true,
            ],
            'school' => [
                'schoolName' => 'SD N 01 Jatipurwo',
                'schoolAddress' => 'Trombol Wetan',
                'adminName' => 'Mariyanto',
                'schoolLogo' => '/pwa-512x512.png',
            ],
            'appearance' => [
                'theme' => 'light',
            ],
            'site' => [
                'siteTitle' => 'Sistem Presensi - SD N 01 Jatipurwo',
                'siteDescription' => 'Sistem Presensi Wajah',
                'favicon' => '/favicon.ico',
                'appTitle' => 'Sistem Presensi',
                'appSubtitle' => 'SD N 01 Jatipurwo',
                'welcomeMessage' => 'Selamat Datang',
            ],
        ];

        foreach ($settings as $key => $value) {
            AppSetting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}

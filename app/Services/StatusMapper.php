<?php

namespace App\Services;

class StatusMapper
{
    public const LEGACY = ['hadir', 'terlambat', 'izin', 'sakit', 'tidak-hadir'];

    public static function normalize(string $status): string
    {
        return match ($status) {
            'Hadir' => 'hadir',
            'Terlambat' => 'terlambat',
            'Izin' => 'izin',
            'Sakit' => 'sakit',
            'Tidak Hadir' => 'tidak-hadir',
            default => $status,
        };
    }
}

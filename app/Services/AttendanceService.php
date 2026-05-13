<?php

namespace App\Services;

use App\Models\AttendanceRecord;

class AttendanceService
{
    public function computeStatus(string $time, string $lateThreshold = '07:05'): string
    {
        return substr($time, 0, 5) > $lateThreshold ? 'terlambat' : 'hadir';
    }

    public function upsert(string $studentId, string $date, string $status, ?string $time = null): AttendanceRecord
    {
        return AttendanceRecord::updateOrCreate(
            ['student_id' => $studentId, 'date' => $date],
            ['status' => StatusMapper::normalize($status), 'time' => $time ?: now()->format('H:i:s')]
        );
    }
}

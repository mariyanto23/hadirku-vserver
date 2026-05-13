<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Student;
use App\Services\ApiResponse;

class DashboardController extends Controller
{
    public function stats()
    {
        $today = now()->toDateString();

        return ApiResponse::ok([
            'total_students' => Student::count(),
            'present_today' => AttendanceRecord::whereDate('date', $today)->where('status', 'hadir')->count(),
            'late_today' => AttendanceRecord::whereDate('date', $today)->where('status', 'terlambat')->count(),
            'izin_today' => AttendanceRecord::whereDate('date', $today)->where('status', 'izin')->count(),
            'sakit_today' => AttendanceRecord::whereDate('date', $today)->where('status', 'sakit')->count(),
        ]);
    }
}

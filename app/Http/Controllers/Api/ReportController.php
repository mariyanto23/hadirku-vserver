<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Services\ApiResponse;
use App\Services\StatusMapper;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function attendance(Request $request)
    {
        $query = AttendanceRecord::with('student.classRoom')->orderByDesc('date');

        if ($request->filled('start_date')) {
            $query->whereDate('date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('date', '<=', $request->end_date);
        }
        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }
        if ($request->filled('status')) {
            $query->where('status', StatusMapper::normalize($request->status));
        }

        if (! $request->user()->hasRole('admin')) {
            $ids = $request->user()->hasRole('student') ? [$request->user()->linkedStudentId()] : $request->user()->parentStudentIds();
            $query->whereIn('student_id', array_filter($ids));
        }

        return ApiResponse::ok($query->limit(1000)->get());
    }

    public function trend()
    {
        return ApiResponse::ok($this->trendRows(now()->subDays(13)->toDateString(), now()->toDateString()));
    }

    public function parentTrend(Request $request)
    {
        return ApiResponse::ok(
            $this->trendRows(now()->subDays(13)->toDateString(), now()->toDateString(), $request->user()->parentStudentIds())
        );
    }

    private function trendRows(string $start, string $end, array $studentIds = []): array
    {
        $query = AttendanceRecord::query()
            ->selectRaw('date, status, count(*) as total')
            ->whereBetween('date', [$start, $end])
            ->groupBy('date', 'status')
            ->orderBy('date');

        if ($studentIds) {
            $query->whereIn('student_id', $studentIds);
        }

        return $query->get()->toArray();
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Student;
use App\Services\ApiResponse;
use App\Services\AttendanceService;
use App\Services\StatusMapper;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = AttendanceRecord::with('student.classRoom');

        if ($request->filled('date')) {
            $date = $request->date === 'today' ? now()->toDateString() : $request->date;
            $query->whereDate('date', $date);
        }
        if ($request->filled('start_date')) {
            $query->whereDate('date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('date', '<=', $request->end_date);
        }
        if ($request->filled('student_id')) {
            $studentId = $request->student_id === 'me' ? $request->user()->linkedStudentId() : $request->student_id;
            $query->where('student_id', $studentId);
        }

        if (! $request->user()->hasRole('admin')) {
            $ids = $request->user()->hasRole('student') ? [$request->user()->linkedStudentId()] : $request->user()->parentStudentIds();
            $query->whereIn('student_id', array_filter($ids));
        }

        return ApiResponse::ok($query->orderByDesc('date')->orderByDesc('time')->limit(1000)->get()->map(fn ($record) => $this->transform($record)));
    }

    public function store(Request $request, AttendanceService $attendanceService)
    {
        $data = $request->validate([
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'date' => ['nullable', 'date'],
            'time' => ['nullable', 'date_format:H:i:s'],
            'status' => ['nullable', 'string', 'in:hadir,terlambat,izin,sakit,tidak-hadir,Hadir,Terlambat,Izin,Sakit,Tidak Hadir'],
        ]);

        abort_unless($this->canWrite($request, $data['student_id']), 403);
        $time = $data['time'] ?? now()->format('H:i:s');
        $status = $data['status'] ?? $attendanceService->computeStatus($time);

        $record = $attendanceService->upsert($data['student_id'], $data['date'] ?? now()->toDateString(), $status, $time);

        return ApiResponse::ok($this->transform($record->load('student.classRoom')), [], 201);
    }

    public function update(Request $request, AttendanceRecord $attendance)
    {
        abort_unless($request->user()->hasRole('admin'), 403);
        $data = $request->validate([
            'time' => ['sometimes', 'date_format:H:i:s'],
            'status' => ['sometimes', 'string', 'in:hadir,terlambat,izin,sakit,tidak-hadir,Hadir,Terlambat,Izin,Sakit,Tidak Hadir'],
        ]);
        if (isset($data['status'])) {
            $data['status'] = StatusMapper::normalize($data['status']);
        }
        $attendance->update($data);

        return ApiResponse::ok($this->transform($attendance->refresh()->load('student.classRoom')));
    }

    public function destroy(Request $request, AttendanceRecord $attendance)
    {
        abort_unless($request->user()->hasRole('admin'), 403);
        $attendance->delete();

        return ApiResponse::ok();
    }

    private function canWrite(Request $request, string $studentId): bool
    {
        $user = $request->user();

        return $user->hasRole('admin') || ($user->hasRole('student') && $user->linkedStudentId() === $studentId);
    }

    private function transform(AttendanceRecord $record): array
    {
        return [
            'id' => $record->id,
            'student_id' => $record->student_id,
            'student_name' => $record->student?->name,
            'student_class' => $record->student?->classRoom?->name,
            'students' => $record->student ? [
                'name' => $record->student->name,
                'nis' => $record->student->nis,
                'photo_url' => $record->student->photo_url,
                'classes' => ['name' => $record->student->classRoom?->name],
            ] : null,
            'date' => $record->date instanceof \Carbon\CarbonInterface ? $record->date->format('Y-m-d') : (string) $record->date,
            'time' => (string) $record->time,
            'status' => StatusMapper::normalize($record->status),
            'created_at' => optional($record->created_at)->toISOString(),
        ];
    }
}

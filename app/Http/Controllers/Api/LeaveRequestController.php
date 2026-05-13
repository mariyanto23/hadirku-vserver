<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Services\ApiResponse;
use App\Services\LeaveApprovalService;
use Illuminate\Http\Request;

class LeaveRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = LeaveRequest::with('student.classRoom')->latest();

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if (! $request->user()->hasRole('admin')) {
            $ids = $request->user()->hasRole('student') ? [$request->user()->linkedStudentId()] : $request->user()->parentStudentIds();
            $query->whereIn('student_id', array_filter($ids));
        }

        return ApiResponse::ok($query->limit((int) $request->integer('limit', 1000))->get()->map(fn ($leaveRequest) => $this->transform($leaveRequest)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'request_date' => ['required', 'date'],
            'leave_type' => ['required', 'string', 'in:izin,sakit,Izin,Sakit'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        abort_unless($request->user()->hasRole('admin') || $request->user()->linkedStudentId() === $data['student_id'], 403);
        $data['leave_type'] = strtolower($data['leave_type']);

        return ApiResponse::ok($this->transform(LeaveRequest::create($data)->load('student.classRoom')), [], 201);
    }

    public function show(Request $request, LeaveRequest $leaveRequest)
    {
        abort_unless($this->canView($request, $leaveRequest), 403);

        return ApiResponse::ok($this->transform($leaveRequest->load('student.classRoom')));
    }

    public function update(Request $request, LeaveRequest $leaveRequest)
    {
        abort_unless($request->user()->hasRole('admin'), 403);
        $data = $request->validate([
            'status' => ['sometimes', 'in:pending,approved,rejected'],
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);
        $leaveRequest->update($data);

        return ApiResponse::ok($this->transform($leaveRequest->refresh()->load('student.classRoom')));
    }

    public function destroy(Request $request, LeaveRequest $leaveRequest)
    {
        abort_unless($request->user()->hasRole('admin'), 403);
        $leaveRequest->delete();

        return ApiResponse::ok();
    }

    public function approve(Request $request, LeaveRequest $leaveRequest, LeaveApprovalService $service)
    {
        $data = $request->validate(['admin_note' => ['nullable', 'string', 'max:2000']]);

        return ApiResponse::ok($service->approve($leaveRequest, $data['admin_note'] ?? null));
    }

    public function reject(Request $request, LeaveRequest $leaveRequest)
    {
        $data = $request->validate(['admin_note' => ['nullable', 'string', 'max:2000']]);
        $leaveRequest->update(['status' => 'rejected', 'admin_note' => $data['admin_note'] ?? null]);

        return ApiResponse::ok($leaveRequest->refresh());
    }

    private function canView(Request $request, LeaveRequest $leaveRequest): bool
    {
        $user = $request->user();

        return $user->hasRole('admin')
            || ($user->hasRole('student') && $user->linkedStudentId() === $leaveRequest->student_id)
            || ($user->hasRole('parent') && in_array($leaveRequest->student_id, $user->parentStudentIds(), true));
    }

    private function transform(LeaveRequest $leaveRequest): array
    {
        return [
            'id' => $leaveRequest->id,
            'student_id' => $leaveRequest->student_id,
            'request_date' => $leaveRequest->request_date instanceof \Carbon\CarbonInterface
                ? $leaveRequest->request_date->format('Y-m-d')
                : (string) $leaveRequest->request_date,
            'leave_type' => $leaveRequest->leave_type,
            'reason' => $leaveRequest->reason,
            'status' => $leaveRequest->status,
            'admin_note' => $leaveRequest->admin_note,
            'created_at' => optional($leaveRequest->created_at)->toISOString(),
            'updated_at' => optional($leaveRequest->updated_at)->toISOString(),
            'students' => $leaveRequest->student ? [
                'name' => $leaveRequest->student->name,
                'nis' => $leaveRequest->student->nis,
                'classes' => ['name' => $leaveRequest->student->classRoom?->name],
            ] : null,
        ];
    }
}

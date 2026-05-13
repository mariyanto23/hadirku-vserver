<?php

namespace App\Services;

use App\Models\LeaveRequest;
use Illuminate\Support\Facades\DB;

class LeaveApprovalService
{
    public function __construct(private AttendanceService $attendanceService)
    {
    }

    public function approve(LeaveRequest $leaveRequest, ?string $adminNote = null): LeaveRequest
    {
        return DB::transaction(function () use ($leaveRequest, $adminNote) {
            $leaveRequest->update([
                'status' => 'approved',
                'admin_note' => $adminNote,
            ]);

            $this->attendanceService->upsert(
                $leaveRequest->student_id,
                $leaveRequest->request_date->format('Y-m-d'),
                $leaveRequest->leave_type,
                '00:00:00'
            );

            return $leaveRequest->refresh();
        });
    }
}

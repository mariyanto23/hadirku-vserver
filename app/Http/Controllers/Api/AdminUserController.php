<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ApiResponse;
use App\Services\UserAccountService;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index()
    {
        return ApiResponse::ok(
            User::with('roles', 'studentLink.student', 'parentStudentLinks.student')
                ->whereHas('roles', fn ($query) => $query->whereIn('role', ['student', 'parent']))
                ->get()
                ->map(fn ($user) => [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'role' => $user->roles->first()?->role,
                    'student_ids' => $user->studentLink
                        ? [$user->studentLink->student_id]
                        : $user->parentStudentLinks->pluck('student_id')->values(),
                    'student_id' => $user->studentLink?->student_id,
                    'parent_user_id' => $user->id,
                    'student_names' => $user->studentLink
                        ? [$user->studentLink->student?->name]
                        : $user->parentStudentLinks->pluck('student.name')->filter()->values(),
                ])
        );
    }

    public function store(Request $request, UserAccountService $service)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'max:128'],
            'role' => ['required', 'in:student,parent'],
            'student_id' => ['required_if:role,student', 'uuid', 'exists:students,id'],
            'student_ids' => ['required_if:role,parent', 'array'],
            'student_ids.*' => ['uuid', 'exists:students,id'],
        ]);

        return ApiResponse::ok($service->create($data), [], 201);
    }

    public function show(User $user)
    {
        return ApiResponse::ok($user->load('roles', 'studentLink', 'parentStudentLinks'));
    }

    public function update(Request $request, User $user, UserAccountService $service)
    {
        $data = $request->validate([
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'password' => ['nullable', 'string', 'min:6', 'max:128'],
            'student_ids' => ['nullable', 'array'],
            'student_ids.*' => ['uuid', 'exists:students,id'],
        ]);

        return ApiResponse::ok($service->update($user, $data));
    }

    public function destroy(User $user)
    {
        abort_if($user->hasRole('admin'), 403);
        $user->delete();

        return ApiResponse::ok();
    }
}

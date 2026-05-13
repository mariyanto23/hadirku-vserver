<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            return ApiResponse::error('Email atau password tidak valid', 'INVALID_CREDENTIALS', 422);
        }

        $request->session()->regenerate();

        return $this->me($request);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('roles', 'studentLink', 'parentStudentLinks');

        return ApiResponse::ok([
            'id' => $user->id,
            'email' => $user->email,
            'roles' => $user->roles->pluck('role')->values(),
            'role' => $user->roles->first()?->role,
            'linked_student_id' => $user->studentLink?->student_id,
            'parent_student_ids' => $user->parentStudentLinks->pluck('student_id')->values(),
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return ApiResponse::ok();
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate(['password' => ['required', 'string', 'min:6', 'max:128']]);
        $request->user()->update(['password' => Hash::make($data['password'])]);

        return ApiResponse::ok();
    }
}

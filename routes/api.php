<?php

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AppSettingController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\ClassController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FaceDescriptorController;
use App\Http\Controllers\Api\HolidayController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\ParentChildrenController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\StorageController;
use App\Http\Controllers\Api\StudentController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->group(function () {
Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:60,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::post('auth/password', [AuthController::class, 'changePassword']);

    Route::get('classes', [ClassController::class, 'index']);
    Route::apiResource('students', StudentController::class);
    Route::post('students/import', [StudentController::class, 'import'])->middleware('role:admin');
    Route::get('students/{student}/faces', [FaceDescriptorController::class, 'index']);
    Route::post('students/{student}/faces', [FaceDescriptorController::class, 'store']);
    Route::delete('students/{student}/faces', [FaceDescriptorController::class, 'destroyStudent']);
    Route::get('faces', [FaceDescriptorController::class, 'all']);
    Route::delete('faces', [FaceDescriptorController::class, 'clear'])->middleware('role:admin');
    Route::delete('faces/{face}', [FaceDescriptorController::class, 'destroy']);

    Route::apiResource('attendance', AttendanceController::class)->only(['index', 'store', 'update', 'destroy'])
        ->middleware('throttle:60,1');

    Route::apiResource('leave-requests', LeaveRequestController::class);
    Route::post('leave-requests/{leaveRequest}/approve', [LeaveRequestController::class, 'approve'])->middleware('role:admin');
    Route::post('leave-requests/{leaveRequest}/reject', [LeaveRequestController::class, 'reject'])->middleware('role:admin');

    Route::get('holidays', [HolidayController::class, 'index']);
    Route::get('settings', [AppSettingController::class, 'index']);
    Route::get('dashboard/stats', [DashboardController::class, 'stats'])->middleware('role:admin');
    Route::get('reports/attendance', [ReportController::class, 'attendance']);
    Route::get('reports/trend', [ReportController::class, 'trend'])->middleware('role:admin');
    Route::get('reports/parent-trend', [ReportController::class, 'parentTrend'])->middleware('role:parent');
    Route::get('parent/children', [ParentChildrenController::class, 'index'])->middleware('role:parent');
    Route::get('storage/sign', [StorageController::class, 'sign']);
    Route::post('storage/upload', [StorageController::class, 'upload']);

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::apiResource('users', AdminUserController::class);
        Route::get('backup', [BackupController::class, 'dump']);
        Route::put('settings', [AppSettingController::class, 'update']);
        Route::apiResource('holidays', HolidayController::class)->except(['index']);
    });
});
});

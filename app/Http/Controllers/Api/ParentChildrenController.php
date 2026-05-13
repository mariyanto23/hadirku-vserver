<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\ApiResponse;
use Illuminate\Http\Request;

class ParentChildrenController extends Controller
{
    public function index(Request $request)
    {
        return ApiResponse::ok(
            Student::with('classRoom')
                ->whereIn('id', $request->user()->parentStudentIds())
                ->orderBy('name')
                ->get()
        );
    }
}

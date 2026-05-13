<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Services\ApiResponse;

class ClassController extends Controller
{
    public function index()
    {
        return ApiResponse::ok(ClassRoom::orderBy('name')->get());
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use App\Services\ApiResponse;
use Illuminate\Http\Request;

class HolidayController extends Controller
{
    public function index(Request $request)
    {
        $query = Holiday::orderBy('date');
        if ($request->boolean('upcoming')) {
            $query->whereDate('date', '>=', now()->toDateString());
        }

        return ApiResponse::ok($query->get());
    }

    public function store(Request $request)
    {
        return ApiResponse::ok(Holiday::create($this->validated($request)), [], 201);
    }

    public function show(Holiday $holiday)
    {
        return ApiResponse::ok($holiday);
    }

    public function update(Request $request, Holiday $holiday)
    {
        $holiday->update($this->validated($request, true));

        return ApiResponse::ok($holiday->refresh());
    }

    public function destroy(Holiday $holiday)
    {
        $holiday->delete();

        return ApiResponse::ok();
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'date' => [$required, 'date'],
            'is_recurring' => ['sometimes', 'boolean'],
        ]);
    }
}

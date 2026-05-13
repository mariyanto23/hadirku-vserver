<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\ApiResponse;
use Illuminate\Http\Request;

class AppSettingController extends Controller
{
    public function index(Request $request)
    {
        if ($request->filled('key')) {
            return ApiResponse::ok(AppSetting::where('key', $request->key)->first()?->value);
        }

        return ApiResponse::ok(AppSetting::pluck('value', 'key'));
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'key' => ['nullable', 'string', 'max:100'],
            'value' => ['nullable'],
            'settings' => ['nullable', 'array'],
        ]);

        if (isset($data['key'])) {
            AppSetting::updateOrCreate(['key' => $data['key']], ['value' => $data['value'] ?? []]);
        }

        foreach ($data['settings'] ?? [] as $key => $value) {
            AppSetting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        return ApiResponse::ok(AppSetting::pluck('value', 'key'));
    }
}

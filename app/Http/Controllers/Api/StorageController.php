<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class StorageController extends Controller
{
    public function sign(Request $request)
    {
        $data = $request->validate([
            'path' => ['required', 'string'],
            'bucket' => ['nullable', 'string'],
        ]);

        $path = ltrim($data['path'], '/');
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return ApiResponse::ok(['signedUrl' => $path, 'signed_url' => $path]);
        }

        $url = URL::temporarySignedRoute('storage.private', now()->addMinutes(60), ['path' => $path]);

        return ApiResponse::ok(['signedUrl' => $url, 'signed_url' => $url]);
    }

    public function upload(Request $request)
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,ico,svg', 'max:5120'],
            'bucket' => ['required', 'string', 'in:student-photos,school-assets'],
            'path' => ['required', 'string', 'max:255'],
        ]);

        $path = ltrim(str_replace(['..', '\\'], ['', '/'], $data['path']), '/');

        if ($data['bucket'] === 'school-assets') {
            $targetDir = public_path('school-assets');
            File::ensureDirectoryExists($targetDir);
            $request->file('file')->move($targetDir, basename($path));
            $url = '/school-assets/'.basename($path);

            return ApiResponse::ok(['path' => $url, 'publicUrl' => $url, 'public_url' => $url]);
        }

        $storedPath = $request->file('file')->storeAs('student-photos/'.dirname($path), basename($path), 'local');

        return ApiResponse::ok(['path' => $storedPath]);
    }
}

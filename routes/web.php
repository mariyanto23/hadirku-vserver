<?php

use Illuminate\Support\Facades\Route;
use App\Services\BrandingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

Route::get('/manifest.webmanifest', function (BrandingService $branding) {
    return response()->json($branding->manifest())
        ->header('Content-Type', 'application/manifest+json')
        ->header('Cache-Control', 'public, max-age=300');
});

Route::get('/private-storage/{path}', function (Request $request, string $path) {
    abort_unless($request->hasValidSignature(), 403);
    abort_unless(Storage::disk('local')->exists($path), 404);

    return Storage::disk('local')->response($path);
})->where('path', '.*')->name('storage.private');

Route::fallback(fn () => view('app'));

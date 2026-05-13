<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BackupService;
use Illuminate\Http\Request;

class BackupController extends Controller
{
    public function dump(Request $request, BackupService $service)
    {
        $format = strtolower($request->query('format', 'json'));
        abort_unless(in_array($format, ['json', 'sql'], true), 400);

        $filename = 'full-dump-presensi-'.now()->format('Y-m-d-Hi').'.'.$format;

        if ($format === 'sql') {
            return response($service->sqlDump($request->user()->email), 200, [
                'Content-Type' => 'application/sql; charset=utf-8',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            ]);
        }

        return response()->json($service->jsonPayload($request->user()->email), 200, [
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}

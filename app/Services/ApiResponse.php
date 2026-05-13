<?php

namespace App\Services;

class ApiResponse
{
    public static function ok(mixed $data = null, array $meta = [], int $status = 200)
    {
        return response()->json(['data' => $data, 'meta' => (object) $meta, 'error' => null], $status);
    }

    public static function error(string $message, string $code = 'ERROR', int $status = 400)
    {
        return response()->json(['data' => null, 'error' => ['message' => $message, 'code' => $code]], $status);
    }
}

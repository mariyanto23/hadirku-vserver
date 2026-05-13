<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FaceDescriptor;
use App\Models\Student;
use App\Services\ApiResponse;
use App\Services\FaceDescriptorService;
use Illuminate\Http\Request;

class FaceDescriptorController extends Controller
{
    public function all()
    {
        return ApiResponse::ok(
            FaceDescriptor::with('student.classRoom')->oldest('created_at')->get()->map(fn ($face) => [
                'id' => $face->id,
                'student_id' => $face->student_id,
                'descriptor' => $face->descriptor,
                'created_at' => optional($face->created_at)->toISOString(),
                'students' => [
                    'name' => $face->student?->name,
                    'nis' => $face->student?->nis,
                    'classes' => ['name' => $face->student?->classRoom?->name],
                ],
            ])
        );
    }

    public function index(Request $request, Student $student)
    {
        abort_unless($this->canAccess($request, $student), 403);

        return ApiResponse::ok($student->faceDescriptors()->oldest('created_at')->get());
    }

    public function store(Request $request, Student $student, FaceDescriptorService $service)
    {
        abort_unless($this->canAccess($request, $student), 403);
        $data = $request->validate(['descriptor' => ['required', 'array', 'size:128']]);

        return ApiResponse::ok($service->add($student, $data['descriptor']), [], 201);
    }

    public function destroy(Request $request, FaceDescriptor $face, FaceDescriptorService $service)
    {
        abort_unless($this->canAccess($request, $face->student), 403);
        $service->delete($face);

        return ApiResponse::ok();
    }

    public function clear(Request $request)
    {
        abort_unless($request->user()->hasRole('admin'), 403);
        FaceDescriptor::query()->delete();
        Student::query()->update(['has_embedding' => false]);

        return ApiResponse::ok();
    }

    public function destroyStudent(Request $request, Student $student)
    {
        abort_unless($this->canAccess($request, $student), 403);
        $student->faceDescriptors()->delete();
        $student->update(['has_embedding' => false]);

        return ApiResponse::ok();
    }

    private function canAccess(Request $request, Student $student): bool
    {
        $user = $request->user();

        return $user->hasRole('admin') || ($user->hasRole('student') && $user->linkedStudentId() === $student->id);
    }
}

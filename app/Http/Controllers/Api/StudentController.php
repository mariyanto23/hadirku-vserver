<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::with('classRoom')->orderBy('name');
        $user = $request->user();

        if (! $user->hasRole('admin')) {
            if ($user->hasRole('student')) {
                $query->where('id', $user->linkedStudentId());
            } elseif ($user->hasRole('parent')) {
                $query->whereIn('id', $user->parentStudentIds());
            }
        }

        return ApiResponse::ok($query->get()->map(fn ($student) => $this->transform($student)));
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->hasRole('admin'), 403);
        $data = $request->validate([
            'nis' => ['required', 'string', 'max:50', 'unique:students,nis'],
            'name' => ['required', 'string', 'max:255'],
            'class_id' => ['nullable', 'uuid', 'exists:classes,id'],
            'photo_url' => ['nullable', 'string'],
        ]);

        return ApiResponse::ok($this->transform(Student::create($data)), [], 201);
    }

    public function show(Request $request, Student $student)
    {
        abort_unless($this->canView($request, $student), 403);

        return ApiResponse::ok($this->transform($student->load('classRoom')));
    }

    public function update(Request $request, Student $student)
    {
        abort_unless($request->user()->hasRole('admin'), 403);
        $data = $request->validate([
            'nis' => ['sometimes', 'string', 'max:50', 'unique:students,nis,'.$student->id],
            'name' => ['sometimes', 'string', 'max:255'],
            'class_id' => ['nullable', 'uuid', 'exists:classes,id'],
            'photo_url' => ['nullable', 'string'],
            'has_embedding' => ['sometimes', 'boolean'],
        ]);

        $student->update($data);

        return ApiResponse::ok($this->transform($student->refresh()->load('classRoom')));
    }

    public function destroy(Request $request, Student $student)
    {
        abort_unless($request->user()->hasRole('admin'), 403);
        $student->delete();

        return ApiResponse::ok();
    }

    public function import(Request $request)
    {
        $rows = $request->validate(['rows' => ['required', 'array']])['rows'];
        $created = 0;

        foreach ($rows as $row) {
            if (! empty($row['nis']) && ! empty($row['name'])) {
                Student::updateOrCreate(['nis' => $row['nis']], [
                    'name' => $row['name'],
                    'class_id' => $row['class_id'] ?? null,
                ]);
                $created++;
            }
        }

        return ApiResponse::ok(['count' => $created]);
    }

    public function uploadPhoto(Request $request, Student $student)
    {
        abort_unless($request->user()->hasRole('admin'), 403);
        $request->validate(['photo' => ['required', 'image', 'max:5120']]);
        $path = $request->file('photo')->store("student-photos/students/{$student->id}", 'local');
        $student->update(['photo_url' => $path]);

        return ApiResponse::ok(['path' => $path]);
    }

    private function canView(Request $request, Student $student): bool
    {
        $user = $request->user();

        return $user->hasRole('admin')
            || ($user->hasRole('student') && $user->linkedStudentId() === $student->id)
            || ($user->hasRole('parent') && in_array($student->id, $user->parentStudentIds(), true));
    }

    private function transform(Student $student): array
    {
        return [
            'id' => $student->id,
            'nis' => $student->nis,
            'name' => $student->name,
            'class_id' => $student->class_id,
            'class_name' => $student->classRoom?->name,
            'classes' => $student->classRoom ? ['name' => $student->classRoom->name] : null,
            'photo_url' => $student->photo_url,
            'has_embedding' => $student->has_embedding,
            'created_at' => optional($student->created_at)->toISOString(),
            'updated_at' => optional($student->updated_at)->toISOString(),
        ];
    }
}

<?php

namespace App\Services;

use App\Models\FaceDescriptor;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

class FaceDescriptorService
{
    public function add(Student $student, array $descriptor): FaceDescriptor
    {
        return DB::transaction(function () use ($student, $descriptor) {
            $count = $student->faceDescriptors()->count();

            if ($count >= 10) {
                $student->faceDescriptors()->oldest('created_at')->limit($count - 9)->delete();
            }

            $face = $student->faceDescriptors()->create(['descriptor' => $descriptor]);
            $student->update(['has_embedding' => true]);

            return $face;
        });
    }

    public function delete(FaceDescriptor $face): void
    {
        DB::transaction(function () use ($face) {
            $student = $face->student;
            $face->delete();
            $student->update(['has_embedding' => $student->faceDescriptors()->exists()]);
        });
    }
}

<?php

namespace App\Services;

use App\Models\ParentStudentLink;
use App\Models\StudentUserLink;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserAccountService
{
    public function create(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['email'],
                'email' => strtolower($data['email']),
                'password' => Hash::make($data['password']),
                'email_verified_at' => now(),
            ]);

            $user->roles()->create(['role' => $data['role']]);

            if ($data['role'] === 'student') {
                StudentUserLink::create(['user_id' => $user->id, 'student_id' => $data['student_id']]);
            }

            if ($data['role'] === 'parent') {
                foreach ($data['student_ids'] ?? [] as $studentId) {
                    ParentStudentLink::create(['parent_user_id' => $user->id, 'student_id' => $studentId]);
                }
            }

            return $user->load('roles', 'studentLink', 'parentStudentLinks');
        });
    }

    public function update(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {
            $updates = [];
            if (! empty($data['email'])) {
                $updates['email'] = strtolower($data['email']);
                $updates['name'] = $updates['email'];
            }
            if (! empty($data['password'])) {
                $updates['password'] = Hash::make($data['password']);
            }
            if ($updates) {
                $user->update($updates);
            }

            if (array_key_exists('student_ids', $data) && $user->hasRole('parent')) {
                ParentStudentLink::where('parent_user_id', $user->id)->delete();
                foreach ($data['student_ids'] ?? [] as $studentId) {
                    ParentStudentLink::create(['parent_user_id' => $user->id, 'student_id' => $studentId]);
                }
            }

            return $user->refresh()->load('roles', 'studentLink', 'parentStudentLinks');
        });
    }
}

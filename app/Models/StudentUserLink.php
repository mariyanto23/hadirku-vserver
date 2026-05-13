<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class StudentUserLink extends Model
{
    use UsesUuid;

    public $timestamps = false;
    protected $fillable = ['user_id', 'student_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}

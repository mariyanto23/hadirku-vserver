<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class ParentStudentLink extends Model
{
    use UsesUuid;

    public $timestamps = false;
    protected $fillable = ['parent_user_id', 'student_id'];

    public function parent()
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}

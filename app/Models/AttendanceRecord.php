<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class AttendanceRecord extends Model
{
    use UsesUuid;

    public $timestamps = false;
    protected $fillable = ['student_id', 'date', 'time', 'status'];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'created_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}

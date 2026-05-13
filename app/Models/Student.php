<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use UsesUuid;

    protected $fillable = ['nis', 'name', 'class_id', 'photo_url', 'has_embedding'];

    protected $casts = [
        'has_embedding' => 'boolean',
    ];

    public function classRoom()
    {
        return $this->belongsTo(ClassRoom::class, 'class_id');
    }

    public function faceDescriptors()
    {
        return $this->hasMany(FaceDescriptor::class);
    }

    public function attendanceRecords()
    {
        return $this->hasMany(AttendanceRecord::class);
    }
}

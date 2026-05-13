<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class FaceDescriptor extends Model
{
    use UsesUuid;

    public $timestamps = false;
    protected $fillable = ['student_id', 'descriptor'];

    protected $casts = [
        'descriptor' => 'array',
        'created_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}

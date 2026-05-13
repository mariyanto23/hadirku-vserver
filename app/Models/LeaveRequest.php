<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    use UsesUuid;

    protected $fillable = ['student_id', 'request_date', 'leave_type', 'reason', 'status', 'admin_note'];

    protected $casts = [
        'request_date' => 'date:Y-m-d',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}

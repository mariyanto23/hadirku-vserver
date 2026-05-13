<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class ClassRoom extends Model
{
    use UsesUuid;

    protected $table = 'classes';
    public $timestamps = false;
    protected $fillable = ['name'];

    public function students()
    {
        return $this->hasMany(Student::class, 'class_id');
    }
}

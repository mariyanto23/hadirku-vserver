<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class UserRole extends Model
{
    use UsesUuid;

    public $timestamps = false;
    protected $fillable = ['user_id', 'role'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

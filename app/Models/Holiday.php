<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use UsesUuid;

    public $timestamps = false;
    protected $fillable = ['name', 'description', 'date', 'is_recurring'];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'is_recurring' => 'boolean',
        'created_at' => 'datetime',
    ];
}

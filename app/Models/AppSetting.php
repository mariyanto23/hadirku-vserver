<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    use UsesUuid;

    public $timestamps = false;
    protected $fillable = ['key', 'value'];

    protected $casts = [
        'value' => 'array',
        'updated_at' => 'datetime',
    ];
}

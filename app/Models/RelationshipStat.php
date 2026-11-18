<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RelationshipStat extends Model
{
    protected $fillable = [
        'total_hugs',
        'last_action_by',
        'daily_gift_unlocked_at',
    ];

    protected function casts(): array
    {
        return [
            'total_hugs' => 'integer',
            'daily_gift_unlocked_at' => 'datetime',
        ];
    }

    public static function singleton(): self
    {
        return self::query()->firstOrCreate(
            ['id' => 1],
            ['total_hugs' => 0, 'last_action_by' => 'No one yet']
        );
    }
}

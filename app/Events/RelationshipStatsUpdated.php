<?php

namespace App\Events;

use App\Models\RelationshipStat;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RelationshipStatsUpdated implements ShouldBroadcast
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public RelationshipStat $stats)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('cozy-space')];
    }

    public function broadcastAs(): string
    {
        return 'relationship.stats.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'stats' => [
                'total_hugs' => $this->stats->total_hugs,
                'last_action_by' => $this->stats->last_action_by,
            ],
        ];
    }
}

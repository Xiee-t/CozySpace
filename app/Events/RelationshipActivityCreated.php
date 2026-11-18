<?php

namespace App\Events;

use App\Models\Activity;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RelationshipActivityCreated implements ShouldBroadcast
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public Activity $activity)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('cozy-space')];
    }

    public function broadcastAs(): string
    {
        return 'relationship.activity.created';
    }

    public function broadcastWith(): array
    {
        return [
            'activity' => [
                'id' => $this->activity->id,
                'type' => $this->activity->type,
                'message' => $this->activity->message,
                'created_at' => $this->activity->created_at?->toISOString(),
            ],
        ];
    }
}

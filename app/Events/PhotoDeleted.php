<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PhotoDeleted implements ShouldBroadcast
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public int $photoId)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('cozy-space')];
    }

    public function broadcastAs(): string
    {
        return 'photo.deleted';
    }

    public function broadcastWith(): array
    {
        return ['photo_id' => $this->photoId];
    }
}

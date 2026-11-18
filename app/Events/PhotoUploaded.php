<?php

namespace App\Events;

use App\Models\Photo;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PhotoUploaded implements ShouldBroadcast
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public Photo $photo)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('cozy-space')];
    }

    public function broadcastAs(): string
    {
        return 'photo.uploaded';
    }

    public function broadcastWith(): array
    {
        return ['photo' => $this->photo->toArray()];
    }
}

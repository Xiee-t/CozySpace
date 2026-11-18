<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LoveNoteDeleted implements ShouldBroadcast
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public int $noteId)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('cozy-space')];
    }

    public function broadcastAs(): string
    {
        return 'love-note.deleted';
    }

    public function broadcastWith(): array
    {
        return ['note_id' => $this->noteId];
    }
}

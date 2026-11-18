<?php

namespace App\Events;

use App\Models\LoveNote;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LoveNoteSaved implements ShouldBroadcast
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public LoveNote $note)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('cozy-space')];
    }

    public function broadcastAs(): string
    {
        return 'love-note.saved';
    }

    public function broadcastWith(): array
    {
        return ['note' => $this->note->toArray()];
    }
}

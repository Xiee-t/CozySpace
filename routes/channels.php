<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('cozy-space', function ($user) {
    return (bool) $user;
});

<?php

namespace App\Http\Controllers;

use App\Events\RelationshipActivityCreated;
use App\Events\RelationshipStatsUpdated;
use App\Models\Activity;
use App\Models\Hug;
use App\Models\RelationshipStat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HugController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        [$stats, $activity] = DB::transaction(function () use ($user) {
            $stats = RelationshipStat::query()->lockForUpdate()->firstOrCreate(
                ['id' => 1],
                ['total_hugs' => 0]
            );

            $stats->increment('total_hugs');
            $stats->forceFill([
                'last_action_by' => $user->name,
            ])->save();

            Hug::query()->create([
                'user_id' => $user->id,
            ]);

            $activity = Activity::query()->create([
                'user_id' => $user->id,
                'type' => 'hug',
                'message' => "{$user->name} sent a hug.",
            ]);

            return [$stats->fresh(), $activity];
        });

        broadcast(new RelationshipStatsUpdated($stats))->toOthers();
        broadcast(new RelationshipActivityCreated($activity))->toOthers();

        return response()->json([
            'stats' => [
                'total_hugs' => $stats->total_hugs,
                'last_action_by' => $stats->last_action_by,
            ],
            'activity' => [
                'id' => $activity->id,
                'type' => $activity->type,
                'message' => $activity->message,
                'created_at' => $activity->created_at?->toISOString(),
            ],
        ]);
    }
}

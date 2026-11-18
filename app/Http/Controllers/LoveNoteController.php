<?php

namespace App\Http\Controllers;

use App\Events\LoveNoteDeleted;
use App\Events\LoveNoteSaved;
use App\Events\RelationshipActivityCreated;
use App\Models\Activity;
use App\Models\LoveNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoveNoteController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'notes' => LoveNote::query()
                ->latest('updated_at')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $note = LoveNote::query()->create([
            ...$this->validatedData($request),
            'user_id' => $request->user()->id,
        ]);

        $activity = Activity::query()->create([
            'user_id' => $request->user()->id,
            'type' => 'note',
            'message' => "{$request->user()->name} added a love note.",
        ]);

        broadcast(new LoveNoteSaved($note))->toOthers();
        broadcast(new RelationshipActivityCreated($activity))->toOthers();

        return response()->json([
            'note' => $note,
            'activity' => $activity,
        ], 201);
    }

    public function update(Request $request, LoveNote $loveNote): JsonResponse
    {
        $loveNote->update($this->validatedData($request));

        $activity = Activity::query()->create([
            'user_id' => $request->user()->id,
            'type' => 'note',
            'message' => "{$request->user()->name} edited a love note.",
        ]);

        broadcast(new LoveNoteSaved($loveNote->fresh()))->toOthers();
        broadcast(new RelationshipActivityCreated($activity))->toOthers();

        return response()->json([
            'note' => $loveNote->fresh(),
            'activity' => $activity,
        ]);
    }

    public function destroy(Request $request, LoveNote $loveNote): JsonResponse
    {
        $noteId = $loveNote->id;
        $loveNote->delete();

        $activity = Activity::query()->create([
            'user_id' => $request->user()->id,
            'type' => 'note',
            'message' => "{$request->user()->name} deleted a love note.",
        ]);

        broadcast(new LoveNoteDeleted($noteId))->toOthers();
        broadcast(new RelationshipActivityCreated($activity))->toOthers();

        return response()->json(status: 204);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:5000'],
        ]);
    }
}

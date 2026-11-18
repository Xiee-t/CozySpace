<?php

namespace App\Http\Controllers;

use App\Events\PhotoDeleted;
use App\Events\PhotoUploaded;
use App\Events\RelationshipActivityCreated;
use App\Models\Activity;
use App\Models\Photo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PhotoController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'photo' => ['required', 'image', 'max:5120'],
            'caption' => ['nullable', 'string', 'max:120'],
        ]);

        $path = $data['photo']->store('daily-gifts', 'public');

        $photo = Photo::query()->create([
            'user_id' => $request->user()->id,
            'path' => $path,
            'original_name' => $data['photo']->getClientOriginalName(),
            'caption' => $data['caption'] ?? null,
        ]);

        $activity = Activity::query()->create([
            'user_id' => $request->user()->id,
            'type' => 'photo',
            'message' => "{$request->user()->name} uploaded a daily gift photo.",
        ]);

        broadcast(new PhotoUploaded($photo))->toOthers();
        broadcast(new RelationshipActivityCreated($activity))->toOthers();

        return response()->json([
            'photo' => $photo,
            'activity' => $activity,
        ], 201);
    }

    public function destroy(Request $request, Photo $photo): JsonResponse
    {
        Storage::disk('public')->delete($photo->path);
        $photoId = $photo->id;
        $photo->delete();

        $activity = Activity::query()->create([
            'user_id' => $request->user()->id,
            'type' => 'photo',
            'message' => "{$request->user()->name} deleted a daily gift photo.",
        ]);

        broadcast(new PhotoDeleted($photoId))->toOthers();
        broadcast(new RelationshipActivityCreated($activity))->toOthers();

        return response()->json(status: 204);
    }
}

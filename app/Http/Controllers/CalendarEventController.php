<?php

namespace App\Http\Controllers;

use App\Events\RelationshipActivityCreated;
use App\Models\Activity;
use App\Models\CalendarEvent;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $month = CarbonImmutable::parse($request->query('month', now()->toDateString()));

        return response()->json([
            'events' => CalendarEvent::query()
                ->whereBetween('event_date', [
                    $month->startOfMonth()->toDateString(),
                    $month->endOfMonth()->toDateString(),
                ])
                ->orderBy('event_date')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedData($request);
        $eventDate = CarbonImmutable::parse($data['event_date'])->startOfDay();

        abort_if($eventDate->isPast() && ! $eventDate->isToday(), 422, 'Past dates are view-only.');

        $event = CalendarEvent::query()->create([
            ...$data,
            'user_id' => $request->user()->id,
        ]);

        $activity = Activity::query()->create([
            'user_id' => $request->user()->id,
            'type' => 'calendar',
            'message' => "{$request->user()->name} added {$event->title} to the calendar.",
        ]);

        broadcast(new RelationshipActivityCreated($activity))->toOthers();

        return response()->json(['event' => $event], 201);
    }

    public function update(Request $request, CalendarEvent $calendarEvent): JsonResponse
    {
        abort_if($calendarEvent->event_date->isPast() && ! $calendarEvent->event_date->isToday(), 422, 'Past dates are view-only.');

        $calendarEvent->update($this->validatedData($request));

        return response()->json(['event' => $calendarEvent->fresh()]);
    }

    public function destroy(CalendarEvent $calendarEvent): JsonResponse
    {
        abort_if($calendarEvent->event_date->isPast() && ! $calendarEvent->event_date->isToday(), 422, 'Past dates are view-only.');

        $calendarEvent->delete();

        return response()->json(status: 204);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'event_date' => ['required', 'date'],
            'title' => ['required', 'string', 'max:120'],
            'body' => ['nullable', 'string', 'max:1000'],
            'type' => ['nullable', 'string', 'max:40'],
        ]);
    }
}

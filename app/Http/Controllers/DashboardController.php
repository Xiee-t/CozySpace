<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\RelationshipStat;
use App\Models\CalendarEvent;
use App\Models\LoveNote;
use App\Models\Photo;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __invoke(Request $request): View
    {
        $stats = RelationshipStat::singleton();
        $today = CarbonImmutable::today();

        return view('dashboard', [
            'stats' => $stats,
            'activities' => Activity::query()
                ->latest()
                ->limit(12)
                ->get(),
            'notes' => LoveNote::query()
                ->latest('updated_at')
                ->limit(20)
                ->get(),
            'dailyPhoto' => Photo::query()
                ->latest()
                ->first(),
            'calendarEvents' => CalendarEvent::query()
                ->whereBetween('event_date', [
                    $today->startOfMonth()->toDateString(),
                    $today->endOfMonth()->toDateString(),
                ])
                ->orderBy('event_date')
                ->get(),
            'relationshipStart' => CarbonImmutable::create(2026, 5, 17),
            'today' => $today,
            'initialView' => $request->is('memories') ? 'memoriesView' : 'dashboardView',
        ]);
    }
}

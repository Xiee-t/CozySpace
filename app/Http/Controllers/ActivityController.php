<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use Illuminate\Http\JsonResponse;

class ActivityController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'activities' => Activity::query()
                ->latest()
                ->limit(30)
                ->get(),
        ]);
    }
}

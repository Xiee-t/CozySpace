<?php

use App\Http\Controllers\CalendarEventController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HugController;
use App\Http\Controllers\LoveNoteController;
use App\Http\Controllers\PhotoController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('/', DashboardController::class)->name('dashboard');
    Route::get('/dashboard', DashboardController::class)->name('dashboard.show');
    Route::get('/memories', DashboardController::class)->name('memories.show');

    Route::post('/hugs', [HugController::class, 'store'])->name('hugs.store');
    Route::get('/activities', [ActivityController::class, 'index'])->name('activities.index');

    Route::get('/notes', [LoveNoteController::class, 'index'])->name('notes.index');
    Route::post('/notes', [LoveNoteController::class, 'store'])->name('notes.store');
    Route::put('/notes/{loveNote}', [LoveNoteController::class, 'update'])->name('notes.update');
    Route::delete('/notes/{loveNote}', [LoveNoteController::class, 'destroy'])->name('notes.destroy');

    Route::post('/photos', [PhotoController::class, 'store'])->name('photos.store');
    Route::delete('/photos/{photo}', [PhotoController::class, 'destroy'])->name('photos.destroy');

    Route::get('/calendar-events', [CalendarEventController::class, 'index'])->name('calendar-events.index');
    Route::post('/calendar-events', [CalendarEventController::class, 'store'])->name('calendar-events.store');
    Route::put('/calendar-events/{calendarEvent}', [CalendarEventController::class, 'update'])->name('calendar-events.update');
    Route::delete('/calendar-events/{calendarEvent}', [CalendarEventController::class, 'destroy'])->name('calendar-events.destroy');
});

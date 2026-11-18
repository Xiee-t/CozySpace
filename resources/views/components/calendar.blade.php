@props(['today', 'calendarEvents', 'relationshipStart'])

<article class="panel calendar-panel">
  <div class="calendar-header">
    <div>
      <p class="panel-kicker">Calendar</p>
      <h2 id="calendarTitle">{{ $today->format('F Y') }}</h2>
    </div>
    <span class="calendar-badge">{{ $relationshipStart->day }}</span>
  </div>
  <div class="calendar-weekdays">
    @foreach (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as $day)
      <span>{{ $day }}</span>
    @endforeach
  </div>
  <div
    class="calendar-grid"
    id="calendarGrid"
    data-events='@json($calendarEvents)'
    data-start-date="{{ $relationshipStart->toDateString() }}"
  ></div>
</article>

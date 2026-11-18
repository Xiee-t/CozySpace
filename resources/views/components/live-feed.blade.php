@props(['activities'])

<article class="panel activity-panel">
  <div class="activity-header">
    <div>
      <p class="panel-kicker">Realtime feed</p>
      <h2>Latest moments</h2>
    </div>
    <span class="live-dot"></span>
  </div>
  <ul class="activity-list" id="activityList">
    @forelse ($activities as $activity)
      <li>{{ $activity->message }}</li>
    @empty
      <li>Nothing yet. Send the first hug.</li>
    @endforelse
  </ul>
</article>

@props(['notes', 'dailyPhoto'])

<article class="panel countdown-panel">
  <p class="panel-kicker">Next anniversary</p>
  <h2>Our next little celebration</h2>
  <div class="anniversary-countdown">
    <strong id="anniversaryDays">--</strong>
    <span>days</span>
    <strong id="anniversaryHours">--</strong>
    <span>hours</span>
  </div>
  <p class="panel-note" id="anniversaryDate">Loading anniversary date</p>
</article>

<div class="memory-grid">
  <x-photo-upload :daily-photo="$dailyPhoto" />
  <x-love-notes :notes="$notes" />
</div>

<x-layouts.app :relationship-start="$relationshipStart">
  <section class="view" id="dashboardView">
    <x-header-card :stats="$stats" :today="$today" />
  </section>

  <section class="view is-active" id="memoriesView">
    <x-memories :notes="$notes" :daily-photo="$dailyPhoto" />
  </section>
</x-layouts.app>

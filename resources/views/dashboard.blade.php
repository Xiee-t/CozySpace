<x-layouts.app :relationship-start="$relationshipStart" :initial-view="$initialView">
  <section class="view @if ($initialView === 'dashboardView') is-active @endif" id="dashboardView">
    <x-header-card :stats="$stats" :today="$today" />

    <div class="dashboard-widgets">
      <x-calendar :today="$today" :calendar-events="$calendarEvents" :relationship-start="$relationshipStart" />
      <x-live-feed :activities="$activities" />
    </div>
  </section>

  <section class="view @if ($initialView === 'memoriesView') is-active @endif" id="memoriesView">
    <x-memories :notes="$notes" :daily-photo="$dailyPhoto" />
  </section>

  <x-modal id="noteModal" title="New Note" kicker="Love notes">
    <form class="note-editor" id="noteForm">
      <input class="note-title-input" id="noteTitleInput" name="title" type="text" placeholder="Title" autocomplete="off">
      <textarea class="note-body-input" id="noteBodyInput" name="body" placeholder="Write something soft..."></textarea>
      <p class="note-save-hint">Saving records the exact date and time.</p>
      <div class="note-actions">
        <button class="ghost-button" id="deleteNoteButton" type="button" disabled>Delete</button>
        <button class="soft-button" type="submit">Save</button>
      </div>
    </form>
  </x-modal>
</x-layouts.app>

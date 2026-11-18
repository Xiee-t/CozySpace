@props(['notes'])

<article class="panel notes-compact-panel">
  <div class="panel-split-header">
    <div>
      <p class="panel-kicker">Love notes</p>
      <h2>Notes</h2>
    </div>
    <button class="soft-button compact-button" id="newNoteButton" type="button">New Note</button>
  </div>

  <ul class="notes-list" id="notesList">
    @forelse ($notes as $note)
      <li class="note-history-item">
        <button class="note-history-button" type="button" data-note='@json($note)'>
          <span class="note-history-title">{{ $note->title }}</span>
          <span class="note-history-preview">{{ \Illuminate\Support\Str::limit($note->body, 58) }}</span>
          <span class="note-history-time">Saved {{ $note->updated_at->format('M j, Y g:i A') }}</span>
        </button>
      </li>
    @empty
      <li class="note-history-item" data-empty-notes>No notes yet. Start with one tiny sentence.</li>
    @endforelse
  </ul>
</article>

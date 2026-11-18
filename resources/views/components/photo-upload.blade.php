@props(['dailyPhoto'])

<article class="panel photo-panel" id="photoPanel" data-photo-id="{{ $dailyPhoto?->id }}">
  <div class="panel-split-header">
    <div>
      <p class="panel-kicker">Daily gift</p>
      <h2>Photo slot</h2>
    </div>
    <div class="photo-actions">
      <button class="soft-button compact-button" id="photoChooseButton" type="button">Choose</button>
      <button class="ghost-button compact-button" id="photoDeleteButton" type="button" @if (! $dailyPhoto) hidden @endif>Delete</button>
    </div>
  </div>

  <form id="photoForm" enctype="multipart/form-data">
    <label class="photo-dropzone" for="photoInput">
      <input id="photoInput" name="photo" type="file" accept="image/*" hidden>
      <span class="photo-empty" id="photoEmpty" @if ($dailyPhoto) hidden @endif>Tap to add today's photo</span>
      <img
        class="photo-preview"
        id="photoPreview"
        src="{{ $dailyPhoto?->url }}"
        alt="Daily gift preview"
        @if (! $dailyPhoto) hidden @endif
      >
    </label>
  </form>

  <p class="panel-note" id="photoStatus">
    {{ $dailyPhoto ? 'Daily gift photo is saved.' : 'Upload a photo to Laravel Storage.' }}
  </p>
</article>

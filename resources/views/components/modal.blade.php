@props(['id', 'title', 'kicker'])

<section class="modal" id="{{ $id }}" aria-hidden="true" role="dialog">
  <div class="modal__backdrop" data-close-modal></div>
  <div class="modal__sheet">
    <div class="modal__header">
      <div>
        <p class="panel-kicker">{{ $kicker }}</p>
        <h2 id="{{ $id }}Title">{{ $title }}</h2>
      </div>
      <button class="icon-button" type="button" data-close-modal aria-label="Close modal">&times;</button>
    </div>

    {{ $slot }}
  </div>
</section>

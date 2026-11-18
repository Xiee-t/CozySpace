@props(['relationshipStart', 'initialView' => 'dashboardView', 'title' => 'Cozy Space'])

<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $title }}</title>
    <link rel="stylesheet" href="{{ asset('css/cozy-space.css') }}">
  </head>
  <body>
    <main class="app-shell">
      {{ $slot }}
    </main>

    <x-bottom-navigation :initial-view="$initialView" />

    <script>
      window.CozySpace = {
        userName: @json(auth()->user()->name),
        relationshipStart: @json($relationshipStart->toDateString()),
        initialView: @json($initialView),
        routes: {
          hugs: @json(route('hugs.store')),
          notes: @json(route('notes.index')),
          photos: @json(route('photos.store')),
          activities: @json(route('activities.index'))
        }
      };
    </script>
    <script src="{{ asset('js/cozy-space.js') }}"></script>
  </body>
</html>

@props(['initialView' => 'dashboardView'])

<nav class="bottom-tabs">
  <button class="tab-button @if ($initialView === 'dashboardView') is-active @endif" type="button" data-target-view="dashboardView">
    <span>&#8962;</span>
    Dashboard
  </button>
  <button class="tab-button @if ($initialView === 'memoriesView') is-active @endif" type="button" data-target-view="memoriesView">
    <span>&#9825;</span>
    Memories
  </button>
</nav>

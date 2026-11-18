@props(['stats', 'today'])

<article class="hero-card" id="heroCard">
  <div class="status-row">
    <span class="status-pill">Realtime live</span>
    <span class="date-chip">{{ $today->format('M j') }}</span>
  </div>

  <div class="title-block">
    <p class="eyebrow">Private space for two</p>
    <h1>Cozy Space</h1>
    <p class="subtitle">A soft little dashboard for hugs, tiny gifts, and real-time love notes.</p>
  </div>

  <div class="profile-strip">
    <button class="profile-chip profile-chip--active" type="button">
      <span class="profile-swatch profile-swatch--me"></span>
      Mine
    </button>
    <button class="profile-chip" type="button">
      <span class="profile-swatch profile-swatch--him"></span>
      His color soon
    </button>
  </div>

  <div class="hug-card">
    <p class="metric-label">Total hugs sent</p>
    <strong class="hug-count" id="hugCount">{{ number_format($stats->total_hugs) }}</strong>
    <p class="last-action" id="lastAction">Last action by {{ $stats->last_action_by ?? 'No one yet' }}.</p>
  </div>

  <button class="heart-button" id="hugButton" type="button">
    <span class="heart-button__halo"></span>
    <span class="heart-button__icon">&hearts;</span>
    <span class="heart-button__text">Send Hug</span>
  </button>
</article>

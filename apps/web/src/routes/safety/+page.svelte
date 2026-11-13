<script lang="ts">
  import { copy } from "$lib/copy";
</script>

<svelte:head><title>{copy.safety.title} · {copy.siteName}</title></svelte:head>

<div class="page-shell narrow-page safety">
  <header class="paper-panel safety-header">
    <h1>{copy.safety.title}</h1>
    <p>{copy.safety.intro}</p>
    <p class="adults"><strong>{copy.safety.adultsOnly}</strong></p>
  </header>

  <section class="paper-panel">
    <h2>{copy.safety.notVettedTitle}</h2>
    <p>{copy.safety.notVetted}</p>
  </section>

  <section class="paper-panel">
    <h2>{copy.safety.meetingTitle}</h2>
    <ul>{#each copy.safety.meetingPoints as point (point)}<li>{point}</li>{/each}</ul>
  </section>

  <section class="paper-panel">
    <h2>{copy.safety.boundariesTitle}</h2>
    <ul>{#each copy.safety.boundariesPoints as point (point)}<li>{point}</li>{/each}</ul>
  </section>

  <section class="paper-panel report-panel">
    <h2>{copy.safety.reportTitle}</h2>
    <p>{copy.safety.report}</p>
    <p class="urgent"><strong>{copy.safety.urgent}</strong></p>
  </section>
</div>

<style>
  .safety {
    display: grid;
    gap: 1rem;
  }

  .safety-header {
    transform: rotate(-0.3deg);
  }

  .safety-header p,
  section p {
    margin-bottom: 0;
  }

  .adults {
    margin-top: 1rem;
    color: var(--brick-dark);
  }

  section:nth-of-type(even) {
    transform: rotate(0.2deg);
  }

  ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  li + li {
    margin-top: 0.65rem;
  }

  .report-panel {
    border-left: 5px solid var(--brick);
  }

  .urgent {
    margin-top: 1rem;
  }
</style>

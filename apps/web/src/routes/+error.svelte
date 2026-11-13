<script lang="ts">
  import { page } from "$app/state";
  import { copy } from "$lib/copy";

  const notFound = $derived(page.status === 404);
  const title = $derived(notFound ? copy.error.notFoundTitle : copy.error.genericTitle);
</script>

<svelte:head><title>{title} · {copy.siteName}</title></svelte:head>

<div class="page-shell narrow-page error-page">
  <section class="paper-panel error-card" aria-labelledby="error-title">
    <span class="lost-pin" aria-hidden="true"></span>
    <p class="label">{page.status}</p>
    <h1 id="error-title">{title}</h1>
    <p>{notFound ? copy.error.notFoundText : copy.error.genericText}</p>
    <div class="button-row">
      <a class="button" href="/">{copy.error.home}</a>
      <a class="button-secondary" href="/skills">{copy.error.skills}</a>
    </div>
  </section>
</div>

<style>
  .error-page {
    display: grid;
    min-height: 55vh;
    place-items: center;
  }

  .error-card {
    position: relative;
    width: 100%;
    text-align: center;
    transform: rotate(-0.4deg);
  }

  .lost-pin {
    display: block;
    width: 1.25rem;
    height: 1.25rem;
    margin: -0.25rem auto 1rem;
    border: 1px solid var(--brick-dark);
    border-radius: 50%;
    background: radial-gradient(circle at 32% 28%, #f2a48f 0 8%, var(--brick) 42% 80%);
    box-shadow: 0 3px 4px rgb(43 33 24 / 30%);
  }

  h1 {
    font-size: clamp(2.6rem, 9vw, 4rem);
  }

  .error-card > p:not(.label) {
    max-width: 32rem;
    margin: 0 auto 1.5rem;
    color: var(--ink-soft);
  }

  .button-row {
    justify-content: center;
  }
</style>

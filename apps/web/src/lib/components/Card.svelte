<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    id: string;
    pinColour?: string;
    title: string;
    eyebrow?: string;
    children: Snippet;
    footer?: Snippet;
  };

  let { id, pinColour = "#b23a26", title, eyebrow, children, footer }: Props = $props();

  function stableTilt(value: string): number {
    let hash = 0;
    for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
    return ((Math.abs(hash) % 400) - 200) / 100;
  }

  const tilt = $derived(stableTilt(id));
</script>

<article class="index-card" style={`--tilt: ${tilt}deg; --pin-colour: ${pinColour};`}>
  <span class="push-pin" aria-hidden="true"></span>
  <header>
    {#if eyebrow}<p class="card-eyebrow">{eyebrow}</p>{/if}
    <h3>{title}</h3>
  </header>
  <div class="card-body">
    {@render children()}
  </div>
  {#if footer}
    <footer class="card-footer">{@render footer()}</footer>
  {/if}
</article>

<style>
  .index-card {
    position: relative;
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.7rem 1.25rem 1.25rem;
    border: 1px solid rgb(76 52 30 / 16%);
    border-radius: 2px;
    background:
      linear-gradient(rgb(255 250 240 / 94%), rgb(255 250 240 / 94%)),
      repeating-linear-gradient(
        to bottom,
        transparent 0,
        transparent 27px,
        rgb(92 139 174 / 17%) 28px
      );
    box-shadow: 0 5px 12px rgb(43 33 24 / 22%);
    color: var(--ink);
    transform: rotate(var(--tilt));
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .index-card:hover,
  .index-card:focus-within {
    z-index: 1;
    box-shadow: 0 9px 18px rgb(43 33 24 / 26%);
    transform: rotate(0deg) translateY(-3px);
  }

  .push-pin {
    position: absolute;
    top: 0.45rem;
    left: calc(50% - 0.48rem);
    width: 0.95rem;
    height: 0.95rem;
    border: 1px solid rgb(43 33 24 / 28%);
    border-radius: 50%;
    background: radial-gradient(circle at 32% 28%, #ffffffa8 0 8%, var(--pin-colour) 36% 75%, #2b211850);
    box-shadow: 0 2px 3px rgb(43 33 24 / 40%);
  }

  header {
    border-bottom: 2px solid rgb(178 58 38 / 45%);
    padding-bottom: 0.4rem;
  }

  h3 {
    margin: 0;
    font-family: var(--font-heading);
    font-size: 1.75rem;
    line-height: 1.05;
    overflow-wrap: anywhere;
  }

  .card-eyebrow {
    margin: 0 0 0.15rem;
    color: var(--ink-soft);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .card-body {
    font-size: 1rem;
    line-height: 1.45;
  }

  .card-body :global(p) {
    margin: 0 0 0.65rem;
  }

  .card-body :global(p:last-child) {
    margin-bottom: 0;
  }

  .card-footer {
    margin-top: auto;
    color: var(--ink-soft);
    font-size: 0.9rem;
    font-weight: 700;
  }

  @media (prefers-reduced-motion: reduce) {
    .index-card {
      transition: none;
    }

    .index-card:hover,
    .index-card:focus-within {
      transform: rotate(var(--tilt));
    }
  }
</style>

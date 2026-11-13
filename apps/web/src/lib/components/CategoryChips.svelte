<script lang="ts">
  import { categories, type CategorySlug } from "$lib/categories";
  import { directory } from "$lib/copy/directory";

  type Props = {
    value: CategorySlug | "all";
    onchange?: (value: CategorySlug | "all") => void;
  };

  let { value, onchange }: Props = $props();

  function choose(next: CategorySlug | "all") {
    if (next === value) return;
    value = next;
    onchange?.(value);
  }
</script>

<fieldset class="chips">
  <legend>{directory.skills.categoryLegend}</legend>
  <div class="chip-row">
    <button
      type="button"
      class="chip"
      aria-pressed={value === "all"}
      onclick={() => choose("all")}
    >{directory.skills.all}</button>
    {#each categories as category (category.slug)}
      <button
        type="button"
        class="chip"
        aria-pressed={value === category.slug}
        style={`--chip-colour: ${category.colour};`}
        onclick={() => choose(category.slug as CategorySlug)}
      >
        <span aria-hidden="true">{category.emoji}</span>
        {category.label}
      </button>
    {/each}
  </div>
</fieldset>

<style>
  .chips {
    /* Fieldsets default to min-width: min-content, which would let a
       nowrap chip row push the page wider than the phone. */
    min-width: 0;
    max-width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    margin: 0 0 0.35rem;
    padding: 0;
    color: var(--brick-dark);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  /* Phones: one swipeable row instead of a wall of chips. */
  @media (max-width: 640px) {
    .chip-row {
      flex-wrap: nowrap;
      overflow-x: auto;
      padding-bottom: 0.35rem;
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
    }

    .chip {
      flex: 0 0 auto;
      scroll-snap-align: start;
    }
  }

  .chip {
    display: inline-flex;
    min-height: 2.25rem;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.7rem;
    border: 1.5px solid rgb(76 52 30 / 30%);
    border-radius: 999px;
    background: var(--paper);
    color: var(--ink);
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
  }

  .chip:hover {
    border-color: var(--chip-colour, var(--brick));
  }

  .chip[aria-pressed="true"] {
    border-color: var(--chip-colour, var(--brick));
    background: var(--chip-colour, var(--brick));
    color: white;
  }
</style>

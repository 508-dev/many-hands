<script lang="ts">
  import type { Snippet } from "svelte";

  let { children, label }: { children: Snippet; label: string } = $props();
</script>

<section class="board" aria-label={label}>
  <div class="card-grid">
    {@render children()}
  </div>
</section>

<style>
  .board {
    min-width: 0;
    padding: 0.35rem;
  }

  .card-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.35rem;
  }

  @media (min-width: 640px) {
    .card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 960px) {
    .card-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>

<script lang="ts">
  import { getCategory } from "$lib/categories";
  import { needsCopy } from "$lib/copy/needs";
  import { buildNeedMatchFilter } from "$lib/filters";
  import { collection } from "$lib/pb";
  import type { Need, Skill } from "$lib/types";

  let { need }: { need: Need } = $props();

  let count = $state<number | null>(null);

  const category = $derived(getCategory(need.category));
  const hasCoords = $derived(need.lat != null && need.lng != null);

  const link = $derived(
    need.lat != null && need.lng != null
      ? `/skills?category=${need.category}&near=${need.lat},${need.lng}&km=25`
      : `/skills?category=${need.category}`,
  );

  $effect(() => {
    const filter = buildNeedMatchFilter(need.category, need.lat, need.lng, 25);
    let cancelled = false;
    count = null;
    collection<Skill>("skills")
      .getList(1, 1, { filter })
      .then((result) => {
        if (!cancelled) count = result.totalItems;
      })
      .catch(() => {
        if (!cancelled) count = null;
      });
    return () => {
      cancelled = true;
    };
  });
</script>

{#if count != null && count > 0}
  <p class="match-hint">
    <a href={link}>
      {hasCoords
        ? needsCopy.match.nearby(count, category.emoji, category.label)
        : needsCopy.match.remote(count, category.emoji, category.label)}
    </a>
  </p>
{/if}

<style>
  .match-hint {
    margin: 0;
  }

  .match-hint a {
    font-weight: 700;
  }
</style>

<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { onDestroy } from "svelte";
  import { auth } from "$lib/auth.svelte";
  import Board from "$lib/components/Board.svelte";
  import CategoryChips from "$lib/components/CategoryChips.svelte";
  import LocationFilter from "$lib/components/LocationFilter.svelte";
  import NeedCard from "$lib/components/NeedCard.svelte";
  import { copy } from "$lib/copy";
  import { directory } from "$lib/copy/directory";
  import { needsCopy } from "$lib/copy/needs";
  import {
    buildNeedListFilter,
    parseSkillFilters,
    skillFiltersToParams,
    withNeedDistances,
    type LocatedNeed,
    type SkillFilters,
  } from "$lib/filters";
  import { collection } from "$lib/pb";
  import type { Need } from "$lib/types";

  const PAGE_SIZE = 12;

  let filters = $state<SkillFilters>(parseSkillFilters(page.url));
  let needs = $state<LocatedNeed[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let visibleCount = $state(PAGE_SIZE);

  let writingUrl = false;
  let requestToken = 0;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const listFilter = $derived.by(() => {
    const extra = buildNeedListFilter(filters);
    return extra ? `status = "open" && ${extra}` : 'status = "open"';
  });
  const sortLocation = $derived(filters.location);

  const defaultPlace = $derived(
    auth.user && auth.user.lat != null && auth.user.lng != null && auth.user.area
      ? { label: auth.user.area, lat: auth.user.lat, lng: auth.user.lng }
      : null,
  );

  const isDefaultFilter = $derived(
    filters.category === "all" &&
      filters.q.trim() === "" &&
      filters.location.km == null &&
      filters.includeRemote,
  );

  $effect(() => {
    const search = skillFiltersToParams(filters).toString();
    const target = search ? `?${search}` : "";
    if (writingUrl) return;
    if (page.url.search === target) return;
    writingUrl = true;
    goto(`${page.url.pathname}${target}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    }).finally(() => {
      writingUrl = false;
    });
  });

  $effect(() => {
    const search = page.url.search;
    void search;
    if (writingUrl) return;
    const incoming = parseSkillFilters(page.url);
    if (skillFiltersToParams(incoming).toString() !== skillFiltersToParams(filters).toString()) {
      filters = incoming;
    }
  });

  $effect(() => {
    const filterStr = listFilter;
    const location = sortLocation;
    const token = ++requestToken;

    clearTimeout(debounce);
    loading = true;
    error = null;

    debounce = setTimeout(() => {
      collection<Need>("needs")
        .getList(1, 500, { filter: filterStr, sort: "-created", expand: "user" })
        .then((result) => {
          if (token !== requestToken) return;
          needs = withNeedDistances(result.items, location);
          visibleCount = PAGE_SIZE;
          loading = false;
        })
        .catch(() => {
          if (token !== requestToken) return;
          needs = [];
          error = needsCopy.board.error;
          loading = false;
        });
    }, 250);
  });

  onDestroy(() => {
    if (debounce) clearTimeout(debounce);
  });

  function clearFilters() {
    filters = {
      q: "",
      category: "all",
      location: { km: null, place: null },
      includeRemote: true,
    };
  }
</script>

<svelte:head><title>{needsCopy.board.title} · {copy.siteName}</title></svelte:head>

<div class="page-shell needs">
  <header class="needs-header">
    <h1 class="paper-label">{needsCopy.board.title}</h1>
    <div class="header-row">
      {#if !loading && !error}
        <p class="count" aria-live="polite">{needsCopy.board.count(needs.length)}</p>
      {/if}
      <a class="button" href={auth.isLoggedIn ? "/needs/new" : "/login?redirect=/needs/new"}>
        {needsCopy.board.postNeed}
      </a>
    </div>
  </header>

  <section class="paper-panel filter-strip" aria-label="Filters">
    <div class="search">
      <label for="needs-search">{needsCopy.board.searchLabel}</label>
      <input
        id="needs-search"
        type="search"
        bind:value={filters.q}
        placeholder={needsCopy.board.searchPlaceholder}
      />
    </div>

    <CategoryChips value={filters.category} onchange={(value) => (filters.category = value)} />

    <LocationFilter bind:value={filters.location} {defaultPlace} />

    <label class="remote">
      <input type="checkbox" bind:checked={filters.includeRemote} />
      <span>{directory.skills.includeRemote}</span>
    </label>
  </section>

  {#if loading}
    <p class="status" role="status">{needsCopy.board.loading}</p>
  {:else if error}
    <p class="status error" role="alert">{error}</p>
  {:else if needs.length === 0}
    <div class="paper-panel empty">
      {#if isDefaultFilter}
        <h2>{needsCopy.board.emptyTitle}</h2>
        <p>{needsCopy.board.emptyText}</p>
        <a class="button" href={auth.isLoggedIn ? "/needs/new" : "/login?redirect=/needs/new"}>
          {needsCopy.board.emptyAction}
        </a>
      {:else}
        <h2>{needsCopy.board.noMatchTitle}</h2>
        <p>{needsCopy.board.noMatchText}</p>
        <button type="button" class="button-secondary" onclick={clearFilters}>
          {needsCopy.board.widen}
        </button>
      {/if}
    </div>
  {:else}
    <Board label={needsCopy.board.title}>
      {#each needs.slice(0, visibleCount) as need (need.id)}
        <NeedCard {need} km={need.km} />
      {/each}
    </Board>
    {#if needs.length > visibleCount}
      <div class="show-more">
        <button type="button" class="button-secondary" onclick={() => (visibleCount += PAGE_SIZE)}>
          {needsCopy.board.showMore}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .needs {
    display: grid;
    gap: 1.5rem;
  }

  .needs-header {
    display: grid;
    gap: 0.75rem;
  }

  .header-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .count {
    margin: 0;
    color: var(--ink-soft);
    font-weight: 700;
  }

  .filter-strip {
    display: grid;
    gap: 1.25rem;
  }

  .search {
    display: grid;
    gap: 0.35rem;
  }

  .search label {
    font-weight: 700;
  }

  .search input {
    width: 100%;
    min-height: 2.9rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: white;
    color: var(--ink);
    font: inherit;
  }

  .remote {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
  }

  .remote input {
    width: 1.15rem;
    height: 1.15rem;
  }

  .status {
    margin: 0;
    padding: 1rem 1.25rem;
    border-radius: 3px;
    background: var(--paper);
    color: var(--ink-soft);
    font-weight: 700;
  }

  .status.error {
    border-left: 5px solid var(--brick);
    color: var(--brick-dark);
  }

  .empty {
    display: grid;
    justify-items: start;
    gap: 0.5rem;
  }

  .empty h2 {
    margin-bottom: 0.25rem;
  }

  .empty p {
    margin: 0 0 0.75rem;
    color: var(--ink-soft);
  }

  .show-more {
    display: flex;
    justify-content: center;
    padding-top: 0.5rem;
  }
</style>

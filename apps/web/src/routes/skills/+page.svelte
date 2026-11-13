<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { onDestroy } from "svelte";
  import { auth } from "$lib/auth.svelte";
  import Board from "$lib/components/Board.svelte";
  import CategoryChips from "$lib/components/CategoryChips.svelte";
  import LocationFilter from "$lib/components/LocationFilter.svelte";
  import SkillCard from "$lib/components/SkillCard.svelte";
  import { copy } from "$lib/copy";
  import { directory } from "$lib/copy/directory";
  import {
    buildSkillListFilter,
    parseSkillFilters,
    skillFiltersToParams,
    withDistances,
    type LocatedSkill,
    type SkillFilters,
  } from "$lib/filters";
  import { collection } from "$lib/pb";
  import type { Skill } from "$lib/types";

  const PAGE_SIZE = 12;

  let filters = $state<SkillFilters>(parseSkillFilters(page.url));
  let skills = $state<LocatedSkill[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let visibleCount = $state(PAGE_SIZE);

  let writingUrl = false;
  let requestToken = 0;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const listFilter = $derived(buildSkillListFilter(filters));
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

  // Keep the URL in sync with the filter state (so links are shareable).
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

  // Adopt the URL when it changes externally (direct link, back/forward).
  $effect(() => {
    const search = page.url.search;
    void search;
    if (writingUrl) return;
    const incoming = parseSkillFilters(page.url);
    if (skillFiltersToParams(incoming).toString() !== skillFiltersToParams(filters).toString()) {
      filters = incoming;
    }
  });

  // Fetch skills for the active filter.
  $effect(() => {
    const filterStr = listFilter;
    const location = sortLocation;
    const token = ++requestToken;

    clearTimeout(debounce);
    loading = true;
    error = null;

    debounce = setTimeout(() => {
      collection<Skill>("skills")
        .getList(1, 500, { filter: filterStr, sort: "-created", expand: "user" })
        .then((result) => {
          if (token !== requestToken) return;
          skills = withDistances(result.items, location);
          visibleCount = PAGE_SIZE;
          loading = false;
        })
        .catch(() => {
          if (token !== requestToken) return;
          skills = [];
          error = directory.skills.error;
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

<svelte:head><title>{directory.skills.title} · {copy.siteName}</title></svelte:head>

<div class="page-shell skills">
  <header class="skills-header">
    <h1 class="paper-label">{directory.skills.title}</h1>
    {#if !loading && !error}
      <p class="count" aria-live="polite">{directory.skills.count(skills.length)}</p>
    {/if}
  </header>

  <section class="paper-panel filter-strip" aria-label="Filters">
    <div class="search">
      <label for="skills-search">{directory.skills.searchLabel}</label>
      <input
        id="skills-search"
        type="search"
        bind:value={filters.q}
        placeholder={directory.skills.searchPlaceholder}
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
    <p class="status" role="status">{directory.skills.loading}</p>
  {:else if error}
    <p class="status error" role="alert">{error}</p>
  {:else if skills.length === 0}
    <div class="paper-panel empty">
      {#if isDefaultFilter}
        <h2>{directory.skills.emptyTitle}</h2>
        <p>{directory.skills.emptyText}</p>
        <a class="button" href={auth.isLoggedIn ? "/me" : "/signup"}>
          {auth.isLoggedIn ? directory.skills.emptyActionMe : directory.skills.emptyActionSignup}
        </a>
      {:else}
        <h2>{directory.skills.noMatchTitle}</h2>
        <p>{directory.skills.noMatchText}</p>
        <button type="button" class="button-secondary" onclick={clearFilters}>
          {directory.skills.widen}
        </button>
      {/if}
    </div>
  {:else}
    <Board label={directory.skills.title}>
      {#each skills.slice(0, visibleCount) as skill (skill.id)}
        <SkillCard {skill} km={skill.km} />
      {/each}
    </Board>
    {#if skills.length > visibleCount}
      <div class="show-more">
        <button type="button" class="button-secondary" onclick={() => (visibleCount += PAGE_SIZE)}>
          {directory.skills.showMore}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .skills {
    display: grid;
    gap: 1.5rem;
  }

  .skills-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
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

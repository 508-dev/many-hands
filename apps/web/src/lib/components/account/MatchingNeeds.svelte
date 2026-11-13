<script lang="ts">
  import { getCategory, type CategorySlug } from "$lib/categories";
  import { copy } from "$lib/copy";
  import { directory } from "$lib/copy/directory";
  import { boundingBox, formatKm, haversineKm } from "$lib/geo";
  import { collection, pb } from "$lib/pb";
  import type { Need, Skill, User } from "$lib/types";

  type Match = {
    need: Need;
    distance: number | null;
  };

  let { user, skills }: { user: User; skills: Skill[] } = $props();
  let matches = $state<Match[]>([]);
  let loading = $state(true);
  let loadError = $state(false);
  let reloadKey = $state(0);

  const categoryKey = $derived(
    [...new Set(skills.map((skill) => skill.category))].sort().join(","),
  );

  async function loadMatches(categories: CategorySlug[], active: () => boolean) {
    const latitude = user.lat;
    const longitude = user.lng;
    const center =
      latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { lat: latitude, lng: longitude }
        : null;
    const params: Record<string, string | number> = { userId: user.id };
    const categoryFilter = categories
      .map((category, index) => {
        params[`category${index}`] = category;
        return `category = {:category${index}}`;
      })
      .join(" || ");
    const clauses = [`status = "open"`, `user != {:userId}`, `(${categoryFilter})`];

    if (center) {
      const box = boundingBox(center.lat, center.lng, 50);
      Object.assign(params, box);
      clauses.push(
        `((lat >= {:minLat} && lat <= {:maxLat} && lng >= {:minLng} && lng <= {:maxLng}) || mode != "in_person")`,
      );
    }

    loading = true;
    loadError = false;
    try {
      const items = await collection<Need>("needs").getFullList({
        filter: pb.filter(clauses.join(" && "), params),
        sort: "-created",
      });
      if (!active()) return;

      matches = items
        .map((need): Match => ({
          need,
          distance:
            center && need.lat != null && need.lng != null
              ? haversineKm(center, { lat: need.lat, lng: need.lng })
              : null,
        }))
        .sort((a, b) => {
          if (a.distance == null && b.distance == null) {
            return b.need.created.localeCompare(a.need.created);
          }
          if (a.distance == null) return 1;
          if (b.distance == null) return -1;
          return a.distance - b.distance;
        })
        .slice(0, 6);
    } catch {
      if (active()) loadError = true;
    } finally {
      if (active()) loading = false;
    }
  }

  $effect(() => {
    const categories = categoryKey ? (categoryKey.split(",") as CategorySlug[]) : [];
    const key = reloadKey;
    let active = true;

    if (categories.length === 0) {
      matches = [];
      loading = false;
      loadError = false;
    } else {
      void loadMatches(categories, () => active && key === reloadKey);
    }

    return () => {
      active = false;
    };
  });
</script>

<section class="paper-panel account-section" aria-labelledby="matching-needs-title">
  <h2 id="matching-needs-title">{copy.matchingNeeds.title}</h2>
  <p class="section-intro">{copy.matchingNeeds.intro}</p>

  {#if loading}
    <p class="state" aria-live="polite">{copy.matchingNeeds.loading}</p>
  {:else if loadError}
    <div class="state" role="alert">
      <p>{copy.matchingNeeds.error}</p>
      <button class="button-secondary" type="button" onclick={() => (reloadKey += 1)}>
        {copy.matchingNeeds.tryAgain}
      </button>
    </div>
  {:else if categoryKey.length === 0}
    <p class="state empty">{copy.matchingNeeds.emptyNoSkills} <a href="#skills-title">{copy.matchingNeeds.addSkill}</a></p>
  {:else if matches.length === 0}
    <p class="state empty">{copy.matchingNeeds.emptyNoMatches}</p>
  {:else}
    <ul class="matching-list">
      {#each matches as match (match.need.id)}
        {@const category = getCategory(match.need.category)}
        <li>
          <a href={`/needs/${match.need.id}`}>
            <span class="need-title">{match.need.title}</span>
            <span class="need-meta">
              {category.emoji} {category.label} · {directory.mode[match.need.mode]}
              {#if match.need.area} · {match.need.area}{/if}
              {#if match.distance != null} · {formatKm(match.distance)}{/if}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  h2 {
    margin-bottom: 0.35rem;
  }

  .section-intro {
    margin-top: 0;
    color: var(--ink-soft);
  }

  .state {
    margin-bottom: 0;
  }

  .state p {
    margin-top: 0;
  }

  .empty {
    color: var(--ink-soft);
  }

  .matching-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .matching-list li {
    border-bottom: 1px solid var(--paper-dark);
  }

  .matching-list li:last-child {
    border-bottom: 0;
  }

  .matching-list a {
    display: flex;
    min-height: 3.5rem;
    flex-direction: column;
    justify-content: center;
    gap: 0.15rem;
    padding-block: 0.65rem;
    color: var(--ink);
    text-decoration: none;
  }

  .matching-list a:hover .need-title {
    color: var(--brick-dark);
    text-decoration: underline;
    text-underline-offset: 0.16em;
  }

  .need-title {
    font-weight: 700;
  }

  .need-meta {
    color: var(--ink-soft);
    font-size: 0.85rem;
  }
</style>

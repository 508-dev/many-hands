<script lang="ts">
  import { directory } from "$lib/copy/directory";
  import type { LocationFilter } from "$lib/filters";
  import type { Place } from "$lib/geo";
  import PlacePicker from "$lib/components/PlacePicker.svelte";

  type Props = {
    value?: LocationFilter;
    defaultPlace: Place | null;
  };

  let { value = $bindable({ km: null, place: null }), defaultPlace }: Props = $props();

  const distances = [10, 25, 50, 100];

  const hasDefault = $derived(
    defaultPlace != null && defaultPlace.lat != null && defaultPlace.lng != null,
  );

  function samePlace(a: Place | null, b: Place | null): boolean {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) {
      return a.label === b.label;
    }
    return Math.abs(a.lat - b.lat) < 0.0001 && Math.abs(a.lng - b.lng) < 0.0001;
  }

  const useDefault = $derived(
    value.km != null && hasDefault && (value.place == null || samePlace(value.place, defaultPlace)),
  );

  function setKm(raw: string) {
    const km = Number.parseInt(raw, 10);
    const next = Number.isFinite(km) ? km : null;
    let place = value.place;
    if (next != null && place == null && hasDefault) place = defaultPlace;
    value = { km: next, place };
  }
</script>

<fieldset class="location-filter">
  <legend>{directory.skills.distanceLegend}</legend>

  <select value={value.km ?? ""} onchange={(event) => setKm(event.currentTarget.value)}>
    <option value="">{directory.skills.anywhere}</option>
    {#each distances as distance (distance)}
      <option value={distance}>{directory.skills.within(distance)}</option>
    {/each}
  </select>

  {#if value.km != null && useDefault}
    <p class="place">
      {directory.skills.within(value.km)} {directory.skills.nearPlace} {defaultPlace?.label}
    </p>
  {:else if value.km != null}
    <PlacePicker
      id="skills-location"
      label={directory.skills.distanceLegend}
      placeholder={directory.skills.searchPlaceholder}
      bind:value={value.place}
    />
    {#if value.place == null || value.place.lat == null || value.place.lng == null}
      <p class="hint">{directory.skills.pickPlaceHint}</p>
    {/if}
  {/if}
</fieldset>

<style>
  .location-filter {
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

  select {
    width: 100%;
    min-height: 2.9rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: white;
    color: var(--ink);
  }

  .place {
    margin: 0.65rem 0 0;
    padding: 0.6rem 0.75rem;
    border-radius: 3px;
    background: var(--paper-dark);
    font-weight: 700;
  }

  .hint {
    margin: 0.3rem 0 0;
    color: var(--ink-soft);
    font-size: 0.85rem;
  }
</style>

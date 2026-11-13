<script lang="ts">
  import { onDestroy } from "svelte";
  import { copy } from "$lib/copy";
  import { searchPlaces, type Place } from "$lib/geo";

  type Props = {
    value: Place | null;
    label: string;
    placeholder: string;
    id: string;
  };

  let { value = $bindable(null), label, placeholder, id }: Props = $props();
  let query = $state(value?.label ?? "");
  let results = $state<Place[]>([]);
  let open = $state(false);
  let loading = $state(false);
  let activeIndex = $state(-1);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  const listboxId = $derived(`${id}-listbox`);
  const activeId = $derived(activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined);

  function search() {
    value = null;
    open = true;
    activeIndex = -1;
    controller?.abort();
    if (timer) clearTimeout(timer);

    if (query.trim().length < 3) {
      results = [];
      loading = false;
      return;
    }

    loading = true;
    timer = setTimeout(async () => {
      controller = new AbortController();
      try {
        results = await searchPlaces(query, controller.signal);
        activeIndex = results.length > 0 ? 0 : -1;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        results = [];
      } finally {
        if (!controller?.signal.aborted) loading = false;
      }
    }, 350);
  }

  function choose(place: Place) {
    value = place;
    query = place.label;
    results = [];
    open = false;
    activeIndex = -1;
    loading = false;
    controller?.abort();
  }

  function commitText() {
    open = false;
    if (value?.label === query) return;
    const labelText = query.trim();
    value = labelText ? { label: labelText, lat: null, lng: null } : null;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        search();
        return;
      }
      activeIndex = results.length ? (activeIndex + 1) % results.length : -1;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = results.length ? (activeIndex - 1 + results.length) % results.length : -1;
    } else if (event.key === "Enter" && open && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex]);
    } else if (event.key === "Escape") {
      open = false;
      activeIndex = -1;
    }
  }

  onDestroy(() => {
    if (timer) clearTimeout(timer);
    controller?.abort();
  });
</script>

<div class="place-picker">
  <label for={id}>{label}</label>
  <input
    {id}
    bind:value={query}
    {placeholder}
    role="combobox"
    aria-autocomplete="list"
    aria-expanded={open}
    aria-controls={listboxId}
    aria-activedescendant={activeId}
    aria-describedby={`${id}-help ${id}-attribution`}
    autocomplete="off"
    oninput={search}
    onkeydown={handleKeydown}
    onblur={commitText}
  />
  <p class="help" id={`${id}-help`}>{copy.placePicker.instructions}</p>
  {#if open}
    <div class="results-wrap">
      <ul id={listboxId} role="listbox" aria-label={label}>
        {#each results as place, index (place.label)}
          <li>
            <button
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              tabindex="-1"
              onmousedown={(event) => event.preventDefault()}
              onclick={() => choose(place)}
            >{place.label}</button>
          </li>
        {/each}
      </ul>
      <p class="status" aria-live="polite">
        {#if loading}{copy.common.loading}{:else if results.length === 0 && query.trim().length >= 3}{copy.common.noResults}{/if}
      </p>
    </div>
  {/if}
  <p class="attribution" id={`${id}-attribution`}>{copy.placePicker.attribution}</p>
</div>

<style>
  .place-picker {
    position: relative;
  }

  label {
    display: block;
    margin-bottom: 0.35rem;
    font-weight: 700;
  }

  input {
    width: 100%;
    min-height: 2.9rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: white;
    color: var(--ink);
    font: inherit;
  }

  .help,
  .attribution,
  .status {
    margin: 0.3rem 0 0;
    color: var(--ink-soft);
    font-size: 0.8rem;
  }

  .results-wrap {
    position: absolute;
    z-index: 5;
    right: 0;
    left: 0;
    margin-top: 0.2rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: var(--paper);
    box-shadow: 0 6px 18px rgb(43 33 24 / 25%);
  }

  ul {
    max-height: 15rem;
    margin: 0;
    padding: 0.25rem;
    overflow-y: auto;
    list-style: none;
  }

  button {
    width: 100%;
    padding: 0.75rem;
    border: 0;
    border-radius: 2px;
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
  }

  button[aria-selected="true"],
  button:hover {
    background: var(--paper-dark);
  }

  .status {
    padding: 0 0.75rem 0.5rem;
  }
</style>

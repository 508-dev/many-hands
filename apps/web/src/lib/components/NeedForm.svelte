<script lang="ts">
  import { untrack } from "svelte";
  import PlacePicker from "$lib/components/PlacePicker.svelte";
  import { categories, type CategorySlug } from "$lib/categories";
  import { directory } from "$lib/copy/directory";
  import { needsCopy } from "$lib/copy/needs";
  import type { Place } from "$lib/geo";
  import { auth } from "$lib/auth.svelte";
  import { collection } from "$lib/pb";
  import type { Mode, Need } from "$lib/types";

  type Props = {
    need?: Need | null;
    defaultPlace?: Place | null;
    oncreated?: (need: Need) => void;
    onupdated?: (need: Need) => void;
  };

  let {
    need = null,
    defaultPlace = null,
    oncreated,
    onupdated,
  }: Props = $props();

  const initial = untrack(() => ({ need, defaultPlace }));
  const modes: Mode[] = ["in_person", "remote", "either"];

  let title = $state(initial.need?.title ?? "");
  let details = $state(initial.need?.details ?? "");
  let category = $state<CategorySlug>(initial.need?.category ?? "other");
  let mode = $state<Mode>(initial.need?.mode ?? "in_person");
  let when = $state(initial.need?.when ?? "");
  let place = $state<Place | null>(
    initial.need?.area
      ? { label: initial.need.area, lat: initial.need.lat, lng: initial.need.lng }
      : initial.defaultPlace,
  );
  let busy = $state(false);
  let error = $state("");

  const isEdit = $derived(need != null);

  async function submit() {
    const me = auth.user;
    busy = true;
    error = "";
    const values = {
      title: title.trim(),
      details: details.trim(),
      category,
      mode,
      area: place?.label ?? "",
      lat: place?.lat ?? null,
      lng: place?.lng ?? null,
      when: when.trim(),
    };

    try {
      if (isEdit && need) {
        const updated = await collection<Need>("needs").update(need.id, values);
        onupdated?.(updated);
      } else if (me) {
        const created = await collection<Need>("needs").create({
          ...values,
          user: me.id,
          status: "open",
        });
        oncreated?.(created);
      } else {
        error = needsCopy.form.error;
      }
    } catch {
      error = needsCopy.form.error;
    } finally {
      busy = false;
    }
  }
</script>

<form
  class="need-form"
  onsubmit={(event) => {
    event.preventDefault();
    void submit();
  }}
>
  <div class="field">
    <label for="need-title">{needsCopy.form.titleLabel}</label>
    <input
      id="need-title"
      bind:value={title}
      placeholder={needsCopy.form.titlePlaceholder}
      minlength="3"
      maxlength="100"
      required
    />
  </div>

  <div class="field">
    <div class="label-row">
      <label for="need-details">{needsCopy.form.detailsLabel}</label>
      <span class="counter">{details.length}/1000</span>
    </div>
    <textarea
      id="need-details"
      bind:value={details}
      placeholder={needsCopy.form.detailsPlaceholder}
      maxlength="1000"
      rows="5"
    ></textarea>
  </div>

  <div class="field">
    <label for="need-category">{needsCopy.form.categoryLabel}</label>
    <select id="need-category" bind:value={category}>
      {#each categories as option (option.slug)}
        <option value={option.slug}>{option.emoji} {option.label}</option>
      {/each}
    </select>
  </div>

  <fieldset>
    <legend>{needsCopy.form.modeLabel}</legend>
    <div class="mode-options">
      {#each modes as option (option)}
        <label>
          <input type="radio" name="need-mode" value={option} bind:group={mode} />
          {directory.mode[option]}
        </label>
      {/each}
    </div>
  </fieldset>

  <PlacePicker
    id="need-area"
    bind:value={place}
    label={needsCopy.form.areaLabel}
    placeholder={needsCopy.form.areaPlaceholder}
  />

  <div class="field">
    <div class="label-row">
      <label for="need-when">{needsCopy.form.whenLabel}</label>
      <span class="counter">{when.length}/80</span>
    </div>
    <input
      id="need-when"
      bind:value={when}
      placeholder={needsCopy.form.whenPlaceholder}
      maxlength="80"
    />
    <p class="help">{needsCopy.form.whenHelp}</p>
  </div>

  {#if error}<p class="form-error" role="alert">{error}</p>{/if}

  <button class="button" type="submit" disabled={busy}>
    {busy ? needsCopy.form.saving : isEdit ? needsCopy.form.saveChanges : needsCopy.form.save}
  </button>
</form>

<style>
  .need-form {
    display: grid;
    gap: 1.25rem;
  }

  .field > label,
  .label-row,
  legend {
    font-weight: 700;
  }

  .field > label {
    display: block;
    margin-bottom: 0.35rem;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }

  .counter,
  .help {
    color: var(--ink-soft);
    font-size: 0.8rem;
    font-weight: 400;
  }

  .help {
    display: block;
    margin: 0.35rem 0 0;
  }

  .need-form input:not([type="radio"]),
  .need-form select,
  .need-form textarea {
    width: 100%;
    min-height: 2.9rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: white;
    color: var(--ink);
  }

  .need-form textarea {
    resize: vertical;
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    margin-bottom: 0.5rem;
  }

  .mode-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem 1rem;
  }

  .mode-options label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mode-options input {
    width: 1.15rem;
    height: 1.15rem;
    margin: 0;
    accent-color: var(--brick);
  }

  .form-error {
    margin: 0;
    padding: 0.75rem;
    border-left: 4px solid var(--brick);
    background: #f8dfd6;
    color: var(--brick-dark);
    font-weight: 700;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.7;
  }
</style>

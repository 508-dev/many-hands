<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import NeedForm from "$lib/components/NeedForm.svelte";
  import { auth } from "$lib/auth.svelte";
  import { copy } from "$lib/copy";
  import { needsCopy } from "$lib/copy/needs";
  import { collection } from "$lib/pb";
  import type { Need, NeedStatus } from "$lib/types";
  import { ClientResponseError } from "pocketbase";

  let need = $state<Need | null>(null);
  let loading = $state(true);
  let notFound = $state(false);
  let loadError = $state(false);
  let busy = $state(false);
  let saved = $state(false);
  let actionError = $state("");

  const isOwner = $derived(auth.isLoggedIn && need != null && auth.user?.id === need.user);

  $effect(() => {
    const id = page.params.id;
    if (!id) return;
    loading = true;
    notFound = false;
    loadError = false;
    actionError = "";
    let cancelled = false;

    collection<Need>("needs")
      .getOne(id)
      .then((result) => {
        if (cancelled) return;
        need = result;
        loading = false;
      })
      .catch((cause) => {
        if (cancelled) return;
        need = null;
        loading = false;
        if (cause instanceof ClientResponseError && cause.status === 404) notFound = true;
        else loadError = true;
      });

    return () => {
      cancelled = true;
    };
  });

  function updated(updatedNeed: Need) {
    need = updatedNeed;
    saved = true;
  }

  async function setStatus(status: NeedStatus) {
    if (!need) return;
    busy = true;
    saved = false;
    actionError = "";
    try {
      const updated = await collection<Need>("needs").update(need.id, { status });
      need = { ...need, ...updated };
    } catch {
      actionError = needsCopy.status.updateError;
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!need) return;
    if (!window.confirm(needsCopy.status.deleteConfirm)) return;
    busy = true;
    actionError = "";
    try {
      await collection<Need>("needs").delete(need.id);
      void goto("/needs");
    } catch {
      actionError = needsCopy.status.deleteError;
      busy = false;
    }
  }
</script>

<svelte:head><title>{needsCopy.form.editTitle} · {copy.siteName}</title></svelte:head>

<div class="page-shell narrow-page">
  {#if loading}
    <p class="status" role="status">{needsCopy.detail.loading}</p>
  {:else if notFound}
    <article class="paper-panel missing">
      <h1>{needsCopy.detail.notFoundTitle}</h1>
      <p>{needsCopy.detail.notFound}</p>
      <a class="button" href="/needs">{needsCopy.board.title}</a>
    </article>
  {:else if loadError || !need}
    <p class="status error" role="alert">{needsCopy.detail.error}</p>
  {:else if !isOwner}
    <article class="paper-panel missing">
      <h1>{needsCopy.form.editTitle}</h1>
      <p>{needsCopy.detail.error}</p>
      <a class="button" href={`/needs/${need.id}`}>{needsCopy.board.title}</a>
    </article>
  {:else}
    <header class="paper-panel form-header">
      <h1>{needsCopy.form.editTitle}</h1>
      <a href={`/needs/${need.id}`}>{needsCopy.board.title}</a>
    </header>

    <section class="paper-panel form-panel">
      {#if saved}<p class="saved" role="status">{needsCopy.form.saved}</p>{/if}
      <NeedForm {need} onupdated={updated} />
    </section>

    <section class="paper-panel status-panel" aria-label={needsCopy.detail.edit}>
      <h2 class="label">{needsCopy.board.title}</h2>
      {#if actionError}<p class="form-error" role="alert">{actionError}</p>{/if}
      <div class="button-row">
        {#if need.status === "open"}
          <button class="button-secondary" type="button" disabled={busy} onclick={() => void setStatus("done")}>
            {needsCopy.status.markDone}
          </button>
          <button class="button-secondary" type="button" disabled={busy} onclick={() => void setStatus("closed")}>
            {needsCopy.status.close}
          </button>
        {:else}
          <button class="button-secondary" type="button" disabled={busy} onclick={() => void setStatus("open")}>
            {needsCopy.status.reopen}
          </button>
        {/if}
        <button class="delete-button" type="button" disabled={busy} onclick={() => void remove()}>
          {busy ? needsCopy.status.deleting : needsCopy.status.delete}
        </button>
      </div>
    </section>
  {/if}
</div>

<style>
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

  .missing {
    display: grid;
    justify-items: start;
    gap: 0.5rem;
  }

  .missing p {
    margin: 0 0 0.75rem;
    color: var(--ink-soft);
  }

  .form-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 1rem;
    transform: rotate(-0.2deg);
  }

  .form-header h1 {
    margin-bottom: 0;
  }

  .form-panel,
  .status-panel {
    display: grid;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .saved {
    margin: 0;
    color: #315f38;
    font-weight: 700;
  }

  .status-panel h2 {
    margin-bottom: 0;
  }

  .form-error {
    margin: 0;
    padding: 0.75rem;
    border-left: 4px solid var(--brick);
    background: #f8dfd6;
    color: var(--brick-dark);
    font-weight: 700;
  }

  .delete-button {
    min-height: 2.9rem;
    padding: 0.7rem 1.05rem;
    border: 2px solid var(--brick-dark);
    border-radius: 4px;
    background: transparent;
    color: var(--brick-dark);
    font-weight: 700;
    cursor: pointer;
  }

  .delete-button:hover {
    background: #f8dfd6;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.7;
  }
</style>

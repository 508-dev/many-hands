<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { auth } from "$lib/auth.svelte";
  import Avatar from "$lib/components/Avatar.svelte";
  import MatchHint from "$lib/components/MatchHint.svelte";
  import ReportButton from "$lib/components/ReportButton.svelte";
  import RequestDialog from "$lib/components/RequestDialog.svelte";
  import { getCategory } from "$lib/categories";
  import { copy } from "$lib/copy";
  import { directory } from "$lib/copy/directory";
  import { needsCopy } from "$lib/copy/needs";
  import { collection, pb } from "$lib/pb";
  import { timeAgo } from "$lib/time";
  import type { HelpRequest, Need, NeedStatus } from "$lib/types";
  import { ClientResponseError } from "pocketbase";

  let need = $state<Need | null>(null);
  let loading = $state(true);
  let notFound = $state(false);
  let loadError = $state(false);
  let offersCount = $state(0);
  let offering = $state(false);
  let busy = $state(false);
  let actionError = $state("");

  const category = $derived(need ? getCategory(need.category) : null);
  const poster = $derived(need?.expand?.user);
  const avatarUrl = $derived(
    poster && poster.avatar ? pb.files.getURL(poster, poster.avatar) : undefined,
  );
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
      .getOne(id, { expand: "user" })
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

  // Count pending offers; the owner (the seeker for offers) may read these.
  $effect(() => {
    const needId = need?.id;
    const userId = auth.user?.id;
    if (!needId || !userId || need?.user !== userId) {
      offersCount = 0;
      return;
    }
    let cancelled = false;
    collection<HelpRequest>("requests")
      .getList(1, 1, { filter: pb.filter('need = {:id} && status = "pending"', { id: needId }) })
      .then((result) => {
        if (!cancelled) offersCount = result.totalItems;
      })
      .catch(() => {
        if (!cancelled) offersCount = 0;
      });
    return () => {
      cancelled = true;
    };
  });

  async function setStatus(status: NeedStatus) {
    if (!need) return;
    busy = true;
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

<svelte:head>
  <title>
    {need ? `${need.title} · ${copy.siteName}` : `${needsCopy.detail.notFoundTitle} · ${copy.siteName}`}
  </title>
</svelte:head>

<div class="page-shell narrow-page need-detail">
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
  {:else}
    {#if need.status === "done"}
      <p class="status-banner done">{needsCopy.status.doneBanner}</p>
    {:else if need.status === "closed"}
      <p class="status-banner closed">{needsCopy.status.closedBanner}</p>
    {/if}

    <article class="paper-panel need-body">
      {#if category}
        <p class="label">{category.emoji} {category.label}</p>
      {/if}
      <h1>{need.title}</h1>

      {#if need.details}<p class="details">{need.details}</p>{/if}

      <p class="mode-badge">{directory.mode[need.mode]}</p>

      {#if need.when}
        <p class="when"><strong>{needsCopy.card.when}:</strong> {need.when}</p>
      {/if}

      {#if need.area}<p class="area">{need.area}</p>{/if}

      {#if poster}
        <div class="poster-row">
          <Avatar name={poster.name} id={poster.id} src={avatarUrl} size="small" />
          <div class="poster-meta">
            <a class="poster-name" href={`/people/${poster.id}`}>{poster.name}</a>
            <span class="poster-sub">{timeAgo(need.created)}</span>
          </div>
        </div>
      {/if}
    </article>

    <MatchHint {need} />

    {#if isOwner}
      <section class="paper-panel owner-panel" aria-label={needsCopy.detail.edit}>
        {#if offersCount > 0}
          <p class="offers">
            <a href="/requests">{needsCopy.detail.offersWaiting(offersCount)}</a>
          </p>
        {/if}
        {#if actionError}<p class="form-error" role="alert">{actionError}</p>{/if}
        <div class="button-row">
          <a class="button-secondary" href={`/needs/${need.id}/edit`}>{needsCopy.detail.edit}</a>
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
    {:else}
      <section class="paper-panel action-panel">
        <div class="button-row">
          {#if auth.isLoggedIn && poster}
            <button class="button" type="button" onclick={() => (offering = true)}>
              {needsCopy.detail.help}
            </button>
          {:else}
            <a class="button" href={`/login?redirect=${encodeURIComponent(page.url.pathname + page.url.search)}`}>
              {needsCopy.card.logInToHelp}
            </a>
          {/if}
          <ReportButton targetType="need" targetId={need.id} targetUser={need.user} label={needsCopy.detail.report} />
        </div>
      </section>
    {/if}
  {/if}
</div>

{#if poster && auth.isLoggedIn && !isOwner && need}
  <RequestDialog bind:open={offering} kind="offer" otherUser={poster} {need} />
{/if}

<style>
  .need-detail {
    display: grid;
    gap: 1rem;
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

  .missing {
    display: grid;
    justify-items: start;
    gap: 0.5rem;
  }

  .missing p {
    margin: 0 0 0.75rem;
    color: var(--ink-soft);
  }

  .status-banner {
    margin: 0;
    padding: 0.75rem 1rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: var(--paper-dark);
    color: var(--ink);
    font-weight: 700;
  }

  .status-banner.done {
    border-color: #6c854d;
    background: #eef3e0;
  }

  .need-body h1 {
    margin-bottom: 0.5rem;
    color: var(--brick-dark);
  }

  .details {
    margin: 0 0 1rem;
    white-space: pre-wrap;
  }

  .mode-badge {
    display: inline-block;
    margin: 0 0 0.6rem;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    background: var(--paper-dark);
    color: var(--ink-soft);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .when,
  .area {
    margin: 0 0 0.4rem;
    color: var(--ink-soft);
  }

  .poster-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-top: 1rem;
    padding-top: 0.9rem;
    border-top: 2px solid rgb(178 58 38 / 45%);
  }

  .poster-meta {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
  }

  .poster-name {
    font-weight: 700;
    color: var(--ink);
    text-decoration: none;
  }

  .poster-name:hover {
    text-decoration: underline;
  }

  .poster-sub {
    color: var(--ink-soft);
    font-size: 0.85rem;
  }

  .offers {
    margin: 0 0 1rem;
    font-weight: 700;
  }

  .form-error {
    margin: 0 0 1rem;
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

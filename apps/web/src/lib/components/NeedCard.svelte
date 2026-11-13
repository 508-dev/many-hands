<script lang="ts">
  import { page } from "$app/state";
  import { auth } from "$lib/auth.svelte";
  import Avatar from "$lib/components/Avatar.svelte";
  import Card from "$lib/components/Card.svelte";
  import ReportButton from "$lib/components/ReportButton.svelte";
  import RequestDialog from "$lib/components/RequestDialog.svelte";
  import { getCategory } from "$lib/categories";
  import { directory } from "$lib/copy/directory";
  import { needsCopy } from "$lib/copy/needs";
  import { formatKm } from "$lib/geo";
  import { pb } from "$lib/pb";
  import { timeAgo } from "$lib/time";
  import type { Need } from "$lib/types";

  type Props = {
    need: Need;
    km?: number | null;
  };

  let { need, km = null }: Props = $props();

  const category = $derived(getCategory(need.category));
  const user = $derived(need.expand?.user);

  const avatarUrl = $derived(user && user.avatar ? pb.files.getURL(user, user.avatar) : undefined);

  const isMine = $derived(auth.isLoggedIn && auth.user?.id === need.user);
  const isOthers = $derived(!isMine && user != null);

  const here = $derived(encodeURIComponent(page.url.pathname + page.url.search));

  let offering = $state(false);
</script>

<Card
  id={need.id}
  title={need.title}
  eyebrow={needsCopy.card.label}
  pinColour={category.colour}
>
  <p class="category">{category.emoji} {category.label}</p>

  {#if need.details}
    <p class="details">{need.details}</p>
  {/if}

  <p class="mode-badge">{directory.mode[need.mode]}</p>

  {#if need.when}
    <p class="when"><strong>{needsCopy.card.when}:</strong> {need.when}</p>
  {/if}

  {#if user}
    <div class="person-row">
      <Avatar name={user.name} id={user.id} src={avatarUrl} size="small" />
      <div class="person-meta">
        <a class="person-name" href={`/people/${user.id}`}>{user.name}</a>
        <span class="person-sub">
          {#if need.area}{need.area}{/if}
          {#if km != null}{need.area ? " · " : ""}{formatKm(km)}{/if}
          {need.area || km != null ? " · " : ""}{timeAgo(need.created)}
        </span>
      </div>
    </div>
  {/if}

  {#snippet footer()}
    <div class="actions">
      {#if isMine}
        <span class="yours">{needsCopy.card.yourNeed}</span>
        <a class="edit" href={`/needs/${need.id}/edit`}>{needsCopy.card.edit}</a>
      {:else if auth.isLoggedIn}
        <button type="button" class="help" onclick={() => (offering = true)}>{needsCopy.card.help}</button>
      {:else}
        <a class="help" href={`/login?redirect=${here}`}>{needsCopy.card.logInToHelp}</a>
      {/if}
      {#if isOthers}
        <ReportButton targetType="need" targetId={need.id} targetUser={need.user} />
      {/if}
    </div>
  {/snippet}
</Card>

{#if user && auth.isLoggedIn && isOthers}
  <RequestDialog bind:open={offering} kind="offer" otherUser={user} {need} />
{/if}

<style>
  .category {
    margin: 0 0 0.4rem;
    color: var(--ink-soft);
    font-weight: 700;
  }

  .details {
    display: -webkit-box;
    margin: 0 0 0.65rem;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    line-clamp: 4;
  }

  .mode-badge {
    display: inline-block;
    margin: 0 0 0.4rem;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    background: var(--paper-dark);
    color: var(--ink-soft);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .when {
    margin: 0 0 0.4rem;
    color: var(--ink-soft);
  }

  .person-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-top: 0.4rem;
  }

  .person-meta {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.05rem;
  }

  .person-name {
    font-weight: 700;
    color: var(--ink);
    text-decoration: none;
  }

  .person-name:hover {
    text-decoration: underline;
  }

  .person-sub {
    color: var(--ink-soft);
    font-size: 0.85rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .help {
    display: inline-flex;
    min-height: 2.5rem;
    align-items: center;
    padding: 0.5rem 0.9rem;
    border: 2px solid var(--brick);
    border-radius: 4px;
    background: var(--brick);
    color: white;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    text-decoration: none;
  }

  .help:hover {
    border-color: var(--brick-dark);
    background: var(--brick-dark);
  }

  .yours {
    font-weight: 700;
    color: var(--ink-soft);
  }

  .edit {
    font-weight: 700;
  }
</style>

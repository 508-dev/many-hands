<script lang="ts">
  import { page } from "$app/state";
  import { auth } from "$lib/auth.svelte";
  import Avatar from "$lib/components/Avatar.svelte";
  import Card from "$lib/components/Card.svelte";
  import ReportButton from "$lib/components/ReportButton.svelte";
  import RequestDialog from "$lib/components/RequestDialog.svelte";
  import { getCategory } from "$lib/categories";
  import { directory } from "$lib/copy/directory";
  import { formatKm } from "$lib/geo";
  import { pb } from "$lib/pb";
  import type { Skill } from "$lib/types";

  type Props = {
    skill: Skill;
    km?: number | null;
    hidePerson?: boolean;
  };

  let { skill, km = null, hidePerson = false }: Props = $props();

  const category = $derived(getCategory(skill.category));
  const user = $derived(skill.expand?.user);

  const avatarUrl = $derived(user && user.avatar ? pb.files.getURL(user, user.avatar) : undefined);

  const isMine = $derived(auth.isLoggedIn && auth.user?.id === skill.user);
  const isOthers = $derived(!isMine && user != null);
  const canAsk = $derived(isOthers && user?.taking_requests !== false);

  const here = $derived(encodeURIComponent(page.url.pathname + page.url.search));

  let asking = $state(false);
</script>

<Card
  id={skill.id}
  title={skill.title}
  eyebrow={`${category.emoji} ${category.label}`}
  pinColour={category.colour}
>
  {#if skill.description}
    <p>{skill.description}</p>
  {/if}

  <p class="mode-badge">{directory.mode[skill.mode]}</p>

  {#if user && !hidePerson}
    <div class="person-row">
      <Avatar name={user.name} id={user.id} src={avatarUrl} size="small" />
      <div class="person-meta">
        <a class="person-name" href={`/people/${user.id}`}>{user.name}</a>
        {#if user.area}<span class="person-area">{user.area}</span>{/if}
        {#if km != null}<span class="person-distance">{formatKm(km)}</span>{/if}
      </div>
    </div>
  {/if}

  {#snippet footer()}
    <div class="actions">
      {#if isMine}
        <span class="you">{directory.card.thisIsYou}</span>
      {:else if auth.isLoggedIn}
        {#if canAsk}
          <button type="button" class="ask" onclick={() => (asking = true)}>{directory.card.ask}</button>
        {:else}
          <span class="not-taking">{directory.card.notTaking}</span>
        {/if}
      {:else}
        <a class="ask" href={`/login?redirect=${here}`}>{directory.card.logInToAsk}</a>
      {/if}
      {#if isOthers}
        <ReportButton targetType="skill" targetId={skill.id} targetUser={skill.user} />
      {/if}
    </div>
  {/snippet}
</Card>

{#if user && auth.isLoggedIn && isOthers}
  <RequestDialog bind:open={asking} kind="ask" otherUser={user} {skill} />
{/if}

<style>
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

  .person-area,
  .person-distance {
    color: var(--ink-soft);
    font-size: 0.85rem;
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .ask {
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

  .ask:hover {
    border-color: var(--brick-dark);
    background: var(--brick-dark);
  }

  .you {
    font-weight: 700;
    color: var(--ink-soft);
  }

  .not-taking {
    font-weight: 700;
    color: var(--ink-soft);
  }
</style>

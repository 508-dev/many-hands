<script lang="ts">
  import { auth } from "$lib/auth.svelte";
  import Avatar from "$lib/components/Avatar.svelte";
  import Board from "$lib/components/Board.svelte";
  import ReportButton from "$lib/components/ReportButton.svelte";
  import SkillCard from "$lib/components/SkillCard.svelte";
  import ThanksList from "$lib/components/ThanksList.svelte";
  import { copy } from "$lib/copy";
  import { directory } from "$lib/copy/directory";
  import { pb } from "$lib/pb";
  import { monthYear } from "$lib/time";

  let { data } = $props();

  const user = $derived(data.user);
  const isMe = $derived(auth.isLoggedIn && auth.user?.id === user?.id);
  const avatarUrl = $derived(user && user.avatar ? pb.files.getURL(user, user.avatar) : undefined);

  const helpedCount = $derived(data.stats?.helped_count ?? 0);
  const thanksCount = $derived(data.stats?.thanks_count ?? data.thanks.length);
</script>

<svelte:head>
  <title>
    {user ? `${user.name} · ${copy.siteName}` : `${directory.profile.notFoundTitle} · ${copy.siteName}`}
  </title>
</svelte:head>

<div class="page-shell narrow-page profile">
  {#if !user}
    <article class="paper-panel missing">
      <h1>{directory.profile.notFoundTitle}</h1>
      <p>{directory.profile.notFound}</p>
      <a class="button" href="/skills">{directory.skills.title}</a>
    </article>
  {:else}
    <header class="paper-panel profile-header">
      <div class="avatar-wrap">
        <Avatar name={user.name} id={user.id} src={avatarUrl} size="large" />
      </div>
      <div class="identity">
        <h1>{user.name}</h1>
        {#if user.area}<p class="area">{user.area}</p>{/if}
        <p class="since">{directory.profile.memberSince(monthYear(user.created))}</p>
        <p class="requests-badge">
          {user.taking_requests ? directory.profile.taking : directory.profile.notTaking}
        </p>
      </div>
      <div class="header-actions">
        {#if isMe}
          <a class="button-secondary" href="/me">{directory.profile.editProfile}</a>
        {:else}
          <ReportButton targetType="user" targetId={user.id} targetUser={user.id} label={directory.profile.report} />
        {/if}
      </div>
    </header>

    {#if user.about}
      <p class="about paper-panel">{user.about}</p>
    {/if}

    <p class="stats paper-panel">{directory.profile.helped(helpedCount, thanksCount)}</p>

    <section class="skills-section" aria-labelledby="profile-skills-title">
      <h2 class="paper-label" id="profile-skills-title">{directory.profile.skillsTitle}</h2>
      {#if data.skills.length === 0}
        <p class="none">{directory.profile.noSkills(user.name)}</p>
      {:else}
        <Board label={directory.profile.skillsTitle}>
          {#each data.skills as skill (skill.id)}
            <SkillCard {skill} />
          {/each}
        </Board>
      {/if}
    </section>

    <section class="thanks-section" aria-labelledby="profile-thanks-title">
      <h2 class="paper-label" id="profile-thanks-title">{directory.profile.thanksTitle}</h2>
      <ThanksList thanks={data.thanks} />
    </section>
  {/if}
</div>

<style>
  .profile {
    display: grid;
    gap: 1rem;
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

  .profile-header {
    display: grid;
    gap: 1rem;
  }

  @media (min-width: 560px) {
    .profile-header {
      grid-template-columns: auto 1fr;
      align-items: start;
    }

    .header-actions {
      grid-column: 1 / -1;
    }
  }

  .identity h1 {
    margin-bottom: 0.25rem;
    color: var(--brick-dark);
  }

  .area {
    margin: 0 0 0.35rem;
    color: var(--ink-soft);
    font-weight: 700;
  }

  .since {
    margin: 0 0 0.75rem;
    color: var(--ink-soft);
    font-size: 0.9rem;
  }

  .requests-badge {
    display: inline-block;
    margin: 0;
    padding: 0.2rem 0.7rem;
    border-radius: 999px;
    background: var(--paper-dark);
    color: var(--ink-soft);
    font-size: 0.9rem;
    font-weight: 700;
  }

  .header-actions {
    display: flex;
    justify-content: flex-start;
  }

  .about {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.55;
  }

  .stats {
    margin: 0;
    font-weight: 700;
  }

  .skills-section,
  .thanks-section {
    display: grid;
    gap: 1rem;
  }

  .none {
    margin: 0;
    color: var(--ink-soft);
  }
</style>

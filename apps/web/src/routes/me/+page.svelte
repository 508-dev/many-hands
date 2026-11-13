<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import ContactForm from "$lib/components/account/ContactForm.svelte";
  import DeleteAccount from "$lib/components/account/DeleteAccount.svelte";
  import MatchingNeeds from "$lib/components/account/MatchingNeeds.svelte";
  import ProfileForm from "$lib/components/account/ProfileForm.svelte";
  import SkillsManager from "$lib/components/account/SkillsManager.svelte";
  import { auth } from "$lib/auth.svelte";
  import { copy } from "$lib/copy";
  import { accountCopy } from "$lib/copy/account";
  import { collection, pb } from "$lib/pb";
  import type { Contact, Need, Skill } from "$lib/types";
  import { ClientResponseError } from "pocketbase";

  let contact = $state<Contact | null>(null);
  let skills = $state<Skill[]>([]);
  let needs = $state<Need[]>([]);
  let requestedId = $state("");
  let loading = $state(true);
  let loaded = $state(false);
  let loadError = $state(false);

  const user = $derived(auth.user);
  const welcome = $derived(page.url.searchParams.get("welcome") === "1");

  async function getContact(userId: string): Promise<Contact | null> {
    try {
      return await collection<Contact>("contacts").getFirstListItem(
        pb.filter("user = {:userId}", { userId }),
      );
    } catch (cause) {
      if (cause instanceof ClientResponseError && cause.status === 404) return null;
      throw cause;
    }
  }

  async function loadAccount(userId: string) {
    loading = true;
    loaded = false;
    loadError = false;
    try {
      const filter = pb.filter("user = {:userId}", { userId });
      const [savedContact, savedSkills, savedNeeds] = await Promise.all([
        getContact(userId),
        collection<Skill>("skills").getFullList({ filter, sort: "-created" }),
        collection<Need>("needs").getFullList({ filter, sort: "-created" }),
      ]);
      contact = savedContact;
      skills = savedSkills;
      needs = savedNeeds;
      loaded = true;
    } catch {
      loadError = true;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    const userId = auth.user?.id;
    if (!userId) {
      const redirectTimer = setTimeout(() => {
        if (!auth.user && page.url.pathname === "/me") void goto("/login?redirect=/me");
      }, 0);
      return () => clearTimeout(redirectTimer);
    }
    if (requestedId !== userId) {
      requestedId = userId;
      void loadAccount(userId);
    }
  });

  function logout() {
    pb.authStore.clear();
    window.location.assign("/");
  }
</script>

<svelte:head><title>{accountCopy.me.title} · {copy.siteName}</title></svelte:head>

<div class="page-shell me-page">
  {#if user}
    <header class="paper-panel me-header">
      <div>
        <p class="label">{user.name}</p>
        <h1>{accountCopy.me.title}</h1>
        <p>{accountCopy.me.intro}</p>
      </div>
      <div class="header-links">
        <a class="button-secondary" href={`/people/${user.id}`}>{accountCopy.me.viewProfile}</a>
        <button class="button-secondary" type="button" onclick={logout}>
          {accountCopy.common.logout}
        </button>
      </div>
    </header>

    {#if welcome}
      <section class="welcome-banner" aria-labelledby="welcome-title">
        <h2 id="welcome-title">{accountCopy.me.welcomeTitle}</h2>
        <p>{accountCopy.me.welcomeText}</p>
      </section>
    {/if}

    {#if loading}
      <section class="paper-panel state-panel" aria-live="polite">
        <p>{accountCopy.common.loading}</p>
      </section>
    {:else if loadError}
      <section class="paper-panel state-panel" role="alert">
        <p>{accountCopy.common.loadError}</p>
        <button class="button" type="button" onclick={() => void loadAccount(user.id)}>
          {accountCopy.common.tryAgain}
        </button>
      </section>
    {:else if loaded}
      {#key user.id}
        <div class="account-stack">
          <ProfileForm {user} />
          <ContactForm userId={user.id} {contact} />
          <SkillsManager userId={user.id} initialSkills={skills} />
          <MatchingNeeds {user} {skills} />

          <section class="paper-panel account-section" aria-labelledby="my-needs-title">
            <div class="needs-heading">
              <h2 id="my-needs-title">{accountCopy.me.needsTitle}</h2>
              <a class="button" href="/needs/new">{accountCopy.me.postNeed}</a>
            </div>
            {#if needs.length === 0}
              <p class="needs-empty">{accountCopy.me.needsEmpty}</p>
            {:else}
              <ul class="needs-list">
                {#each needs as need (need.id)}
                  <li>
                    <a href={`/needs/${need.id}`}>{need.title}</a>
                    <span class={`status ${need.status}`}>{accountCopy.me.needStatus[need.status]}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </section>

          <DeleteAccount userId={user.id} />
        </div>
      {/key}
    {/if}
  {:else}
    <section class="paper-panel state-panel" aria-live="polite">
      <p>{accountCopy.common.loading}</p>
    </section>
  {/if}
</div>

<style>
  .me-page {
    max-width: 64rem;
  }

  .me-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    transform: rotate(-0.15deg);
  }

  .me-header h1 {
    font-size: clamp(2.7rem, 9vw, 4.2rem);
  }

  .me-header p:not(.label) {
    max-width: 38rem;
    margin-bottom: 0;
    color: var(--ink-soft);
  }

  .header-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .welcome-banner {
    margin-top: 1.25rem;
    padding: 1rem 1.25rem;
    border: 1px solid #6c854d;
    border-radius: 3px;
    background: #f0f4df;
    box-shadow: 0 4px 10px rgb(43 33 24 / 18%);
  }

  .welcome-banner h2 {
    margin-bottom: 0.35rem;
    font-size: 2.2rem;
  }

  .welcome-banner p {
    margin: 0;
  }

  .account-stack {
    display: grid;
    gap: 1.4rem;
    margin-top: 1.4rem;
  }

  .state-panel {
    margin-top: 1.4rem;
    text-align: center;
  }

  .state-panel p {
    margin-top: 0;
  }

  .needs-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .needs-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .needs-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-block: 0.8rem;
    border-bottom: 1px solid var(--paper-dark);
  }

  .needs-list li:last-child {
    border-bottom: 0;
  }

  .needs-list a {
    font-weight: 700;
  }

  .status {
    flex: 0 0 auto;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    background: var(--paper-dark);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .status.open {
    background: #e3ecd7;
    color: #31502d;
  }

  .needs-empty {
    margin-bottom: 0;
    color: var(--ink-soft);
  }

  @media (max-width: 480px) {
    .header-links,
    .header-links > * {
      width: 100%;
    }

    .needs-heading .button {
      width: 100%;
    }
  }
</style>

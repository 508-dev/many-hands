<script lang="ts">
  import { page } from "$app/state";
  import { auth } from "$lib/auth.svelte";
  import { copy } from "$lib/copy";

  let { requestsBadge = 0 }: { requestsBadge?: number } = $props();

  const links = [
    { href: "/skills", label: copy.nav.skills },
    { href: "/needs", label: copy.nav.needs },
    { href: "/requests", label: copy.nav.requests, badge: true },
    { href: "/me", label: copy.nav.me },
  ];

  function current(href: string): boolean {
    return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
  }
</script>

<a class="skip-link" href="#main-content">{copy.common.skipToContent}</a>
<header class="top-bar">
  <a class="wordmark" href="/" aria-label={copy.nav.home}>
    <img src="/favicon.svg" alt="" width="36" height="36" />
    <span>{copy.nav.wordmark}</span>
  </a>
  <nav aria-label={copy.nav.primary}>
    {#each links as link (link.href)}
      <a href={link.href} aria-current={current(link.href) ? "page" : undefined}>
        {link.label}
        {#if link.badge && requestsBadge > 0}
          <span class="badge"><span class="sr-only">{requestsBadge} {copy.nav.unreadRequests}</span><span aria-hidden="true">{requestsBadge}</span></span>
        {/if}
      </a>
    {/each}
    {#if !auth.isLoggedIn}
      <a href="/login" aria-current={current("/login") ? "page" : undefined}>{copy.nav.login}</a>
      <a class="join-link" href="/signup" aria-current={current("/signup") ? "page" : undefined}>{copy.nav.join}</a>
    {/if}
  </nav>
</header>

<nav class="bottom-bar" aria-label={copy.nav.mobile}>
  {#each links as link (link.href)}
    <a href={link.href} aria-current={current(link.href) ? "page" : undefined}>
      <span>{link.label}</span>
      {#if link.badge && requestsBadge > 0}
        <span class="badge"><span class="sr-only">{requestsBadge} {copy.nav.unreadRequests}</span><span aria-hidden="true">{requestsBadge}</span></span>
      {/if}
    </a>
  {/each}
</nav>

<style>
  .skip-link {
    position: fixed;
    z-index: 20;
    top: 0.5rem;
    left: 0.5rem;
    padding: 0.7rem 1rem;
    background: var(--paper);
    color: var(--ink);
    transform: translateY(-160%);
  }

  .skip-link:focus {
    transform: translateY(0);
  }

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 4.25rem;
    padding: 0.65rem 1rem;
    border-bottom: 1px solid rgb(76 52 30 / 20%);
    background: var(--paper);
    box-shadow: 0 2px 8px rgb(43 33 24 / 15%);
  }

  .wordmark {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--brick);
    font-family: var(--font-heading);
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    text-decoration: none;
  }

  .top-bar nav {
    display: none;
    align-items: center;
    gap: 0.25rem;
  }

  .top-bar nav a {
    padding: 0.65rem 0.8rem;
    border-radius: 4px;
    color: var(--ink);
    font-weight: 700;
    text-decoration: none;
  }

  .top-bar nav a:hover,
  .top-bar nav a[aria-current="page"] {
    background: var(--paper-dark);
    color: var(--brick-dark);
  }

  .top-bar nav .join-link {
    margin-left: 0.35rem;
    background: var(--brick);
    color: white;
  }

  .bottom-bar {
    position: fixed;
    z-index: 10;
    right: 0;
    bottom: 0;
    left: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding: 0.35rem max(0.25rem, env(safe-area-inset-right)) max(0.35rem, env(safe-area-inset-bottom)) max(0.25rem, env(safe-area-inset-left));
    border-top: 1px solid rgb(76 52 30 / 24%);
    background: var(--paper);
    box-shadow: 0 -2px 10px rgb(43 33 24 / 18%);
  }

  .bottom-bar a {
    position: relative;
    min-height: 3rem;
    padding: 0.75rem 0.2rem;
    border-radius: 4px;
    color: var(--ink-soft);
    font-size: 0.85rem;
    font-weight: 700;
    text-align: center;
    text-decoration: none;
  }

  .bottom-bar a[aria-current="page"] {
    background: var(--paper-dark);
    color: var(--brick-dark);
  }

  .badge {
    display: inline-grid;
    min-width: 1.25rem;
    height: 1.25rem;
    place-items: center;
    margin-left: 0.2rem;
    padding: 0 0.25rem;
    border-radius: 999px;
    background: var(--brick);
    color: white;
    font-size: 0.7rem;
  }

  .bottom-bar .badge {
    position: absolute;
    top: 0.15rem;
    left: calc(50% + 0.7rem);
    margin: 0;
  }

  @media (min-width: 760px) {
    .top-bar {
      padding-inline: max(1.5rem, calc((100vw - 1180px) / 2));
    }

    .top-bar nav {
      display: flex;
    }

    .bottom-bar {
      display: none;
    }
  }
</style>

<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import NeedForm from "$lib/components/NeedForm.svelte";
  import { auth } from "$lib/auth.svelte";
  import { copy } from "$lib/copy";
  import { needsCopy } from "$lib/copy/needs";
  import type { Need } from "$lib/types";

  const defaultPlace = $derived(
    auth.user && auth.user.lat != null && auth.user.lng != null && auth.user.area
      ? { label: auth.user.area, lat: auth.user.lat, lng: auth.user.lng }
      : null,
  );

  $effect(() => {
    if (auth.user) return;
    const timer = setTimeout(() => {
      if (!auth.user && page.url.pathname === "/needs/new") {
        void goto("/login?redirect=/needs/new");
      }
    }, 0);
    return () => clearTimeout(timer);
  });

  function created(need: Need) {
    void goto(`/needs/${need.id}`);
  }
</script>

<svelte:head><title>{needsCopy.form.newTitle} · {copy.siteName}</title></svelte:head>

<div class="page-shell narrow-page">
  {#if auth.isLoggedIn}
    <header class="paper-panel form-header">
      <h1>{needsCopy.form.newTitle}</h1>
      <p>{needsCopy.form.intro}</p>
    </header>

    <section class="paper-panel form-panel">
      <NeedForm {defaultPlace} oncreated={created} />
    </section>
  {:else}
    <section class="paper-panel form-panel">
      <p>{needsCopy.detail.loading}</p>
    </section>
  {/if}
</div>

<style>
  .form-header {
    margin-bottom: 1rem;
    transform: rotate(-0.2deg);
  }

  .form-header h1 {
    margin-bottom: 0.35rem;
  }

  .form-header p {
    margin: 0;
    color: var(--ink-soft);
  }

  .form-panel {
    display: grid;
    gap: 1rem;
  }
</style>

<script lang="ts">
  import "@fontsource/atkinson-hyperlegible/400.css";
  import "@fontsource/atkinson-hyperlegible/700.css";
  import "@fontsource/caveat/700.css";
  import "../app.css";
  import Nav from "$lib/components/Nav.svelte";
  import { auth } from "$lib/auth.svelte";
  import { copy } from "$lib/copy";
  import { unreadRequests } from "$lib/requests.svelte";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();

  $effect(() => {
    const user = auth.user;
    if (user) {
      void unreadRequests.start(user.id);
      return () => unreadRequests.stop();
    }
    unreadRequests.stop();
  });
</script>

<svelte:head>
  <title>{copy.siteName}</title>
  <meta name="description" content={copy.siteDescription} />
</svelte:head>

<Nav requestsBadge={unreadRequests.count} />
<main id="main-content">
  {@render children()}
</main>
<footer class="site-footer">
  <a href="/safety">{copy.nav.safety}</a>
  <span>{copy.footer.moneyFree}</span>
</footer>

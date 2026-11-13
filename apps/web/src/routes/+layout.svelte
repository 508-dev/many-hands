<script lang="ts">
  import "@fontsource/atkinson-hyperlegible/400.css";
  import "@fontsource/atkinson-hyperlegible/700.css";
  import "@fontsource/caveat/700.css";
  import "../app.css";
  import Nav from "$lib/components/Nav.svelte";
  import { copy } from "$lib/copy";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <title>{copy.siteName}</title>
  <meta name="description" content={copy.siteDescription} />
</svelte:head>

<Nav requestsBadge={0} />
<main id="main-content">
  {@render children()}
</main>
<footer class="site-footer">
  <a href="/safety">{copy.nav.safety}</a>
  <span>{copy.footer.moneyFree}</span>
</footer>

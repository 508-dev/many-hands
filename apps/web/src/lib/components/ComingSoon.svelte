<script lang="ts">
  import { copy } from "$lib/copy";

  let { title }: { title: string } = $props();
</script>

<svelte:head><title>{title} · {copy.siteName}</title></svelte:head>

<div class="page-shell narrow-page">
  <article class="paper-panel coming-soon">
    <p class="label">{copy.common.comingSoon}</p>
    <h1>{title}</h1>
    <p>{copy.common.comingSoonText}</p>
    <a class="button" href="/">{copy.nav.home}</a>
  </article>
</div>

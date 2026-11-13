<script lang="ts">
  import { page } from "$app/state";
  import AuthForm from "$lib/components/account/AuthForm.svelte";
  import { copy } from "$lib/copy";
  import { accountCopy } from "$lib/copy/account";

  const redirectTo = $derived(page.url.searchParams.get("redirect") ?? "/skills");
</script>

<svelte:head><title>{accountCopy.login.title} · {copy.siteName}</title></svelte:head>

<AuthForm mode="login" {redirectTo} />

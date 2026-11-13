<script lang="ts">
  import AuthForm from "$lib/components/account/AuthForm.svelte";
  import { copy } from "$lib/copy";
  import { accountCopy } from "$lib/copy/account";
</script>

<svelte:head><title>{accountCopy.signup.title} · {copy.siteName}</title></svelte:head>

<AuthForm mode="signup" />

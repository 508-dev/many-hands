<script lang="ts">
  import { contactLinks } from "$lib/contact";
  import { fill, requestsCopy } from "$lib/copy/requests";
  import type { ContactSnapshot } from "$lib/types";

  let { snapshot, name }: { snapshot: ContactSnapshot; name: string } = $props();

  const links = $derived(contactLinks(snapshot));
  const methodLabel = $derived(requestsCopy.contact.methods[snapshot.method]);

  let copied = $state(false);
  let copyFailed = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  async function copyValue() {
    copyFailed = false;
    try {
      await navigator.clipboard.writeText(snapshot.value);
      copied = true;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      copyFailed = true;
    }
  }
</script>

<section class="contact-reveal" aria-label={requestsCopy.contact.heading}>
  <h4>{requestsCopy.contact.heading}</h4>
  <p class="visibility">{fill(requestsCopy.contact.visibility, { name })}</p>
  <p class="label">{methodLabel}</p>
  <p class="value">{snapshot.value}</p>
  {#if snapshot.note}
    <p class="label">{requestsCopy.contact.noteLabel}</p>
    <p class="note">{snapshot.note}</p>
  {/if}
  <div class="button-row">
    {#each links as link (link.href)}
      <a class="button-secondary button" href={link.href}>{link.label}</a>
    {/each}
    <button type="button" class="button-secondary" onclick={copyValue}>
      {copied ? requestsCopy.contact.copied : requestsCopy.contact.copy}
    </button>
  </div>
  {#if copyFailed}
    <p class="copy-error" role="alert">{requestsCopy.contact.copyError}</p>
  {/if}
  <p class="nudge">
    {requestsCopy.contact.nudgeIntro}<a href="/safety">{requestsCopy.contact.nudgeLink}</a>.
  </p>
</section>

<style>
  .contact-reveal {
    padding: 0.9rem 1rem;
    border: 1px dashed rgb(76 52 30 / 35%);
    border-radius: 4px;
    background: var(--paper-dark);
  }

  h4 {
    margin: 0 0 0.35rem;
    font-family: var(--font-heading);
    font-size: 1.55rem;
    line-height: 1.1;
  }

  .visibility {
    margin: 0 0 0.65rem;
    color: var(--ink-soft);
    font-size: 0.9rem;
  }

  .label {
    margin-bottom: 0.15rem;
  }

  .value {
    margin: 0 0 0.65rem;
    font-size: 1.15rem;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .note {
    margin: 0 0 0.65rem;
    overflow-wrap: anywhere;
  }

  .button-row {
    margin-top: 0.35rem;
  }

  .button,
  .button-secondary {
    min-height: 2.6rem;
  }

  .copy-error {
    margin: 0.5rem 0 0;
    color: var(--brick-dark);
    font-weight: 700;
  }

  .nudge {
    margin: 0.75rem 0 0;
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
</style>

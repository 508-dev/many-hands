<script lang="ts">
  import Modal from "$lib/components/Modal.svelte";
  import { fill, requestsCopy } from "$lib/copy/requests";
  import { collection } from "$lib/pb";
  import type { HelpRequest, ThankYou } from "$lib/types";

  let {
    open = $bindable(false),
    request,
    ondone,
  }: {
    open?: boolean;
    request: HelpRequest | null;
    ondone?: () => void;
  } = $props();

  let message = $state("");
  let busy = $state(false);
  let errorMessage = $state("");
  let done = $state(false);

  const helperName = $derived(request?.expand?.helper?.name ?? requestsCopy.someone);

  $effect(() => {
    if (open) {
      message = "";
      errorMessage = "";
      done = false;
      busy = false;
    }
  });

  async function submit() {
    if (!request || busy) return;
    const trimmed = message.trim();
    if (trimmed.length < 2) {
      errorMessage = requestsCopy.thanks.tooShort;
      return;
    }
    if (trimmed.length > 300) {
      errorMessage = requestsCopy.thanks.tooLong;
      return;
    }
    busy = true;
    errorMessage = "";
    try {
      await collection<ThankYou>("thanks").create(
        {
          request: request.id,
          author: request.seeker,
          helper: request.helper,
          message: trimmed,
        },
        { requestKey: null },
      );
      done = true;
      ondone?.();
    } catch {
      errorMessage = requestsCopy.thanks.error;
    }
    busy = false;
  }
</script>

<Modal bind:open title={requestsCopy.thanks.title}>
  {#if done}
    <p class="success">{fill(requestsCopy.thanks.success, { name: helperName })}</p>
  {:else}
    <form
      onsubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label class="label" for="thanks-message">{requestsCopy.thanks.label}</label>
      <textarea
        id="thanks-message"
        bind:value={message}
        rows="4"
        maxlength="300"
        placeholder={requestsCopy.thanks.placeholder}
      ></textarea>
      <p class="hint">{fill(requestsCopy.thanks.hint, { name: helperName })}</p>
      {#if errorMessage}
        <p class="form-error" role="alert">{errorMessage}</p>
      {/if}
    </form>
  {/if}
  {#snippet actions()}
    {#if done}
      <button type="button" class="button" onclick={() => (open = false)}>
        {requestsCopy.thanks.done}
      </button>
    {:else}
      <button type="button" class="button-secondary" onclick={() => (open = false)}>
        {requestsCopy.thanks.cancel}
      </button>
      <button type="button" class="button" disabled={busy} onclick={() => void submit()}>
        {requestsCopy.thanks.submit}
      </button>
    {/if}
  {/snippet}
</Modal>

<style>
  .label {
    display: block;
  }

  textarea {
    width: 100%;
    padding: 0.65rem 0.75rem;
    border: 2px solid rgb(76 52 30 / 35%);
    border-radius: 4px;
    background: white;
    color: var(--ink);
    line-height: 1.4;
    resize: vertical;
  }

  textarea:focus-visible {
    border-color: var(--focus);
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }

  .hint {
    margin: 0.45rem 0 0;
    color: var(--ink-soft);
    font-size: 0.88rem;
  }

  .form-error {
    margin: 0.55rem 0 0;
    color: var(--brick-dark);
    font-weight: 700;
  }

  .success {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
  }
</style>

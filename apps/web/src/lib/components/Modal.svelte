<script lang="ts">
  import { copy } from "$lib/copy";
  import type { Snippet } from "svelte";

  type Props = {
    open: boolean;
    title: string;
    onclose?: () => void;
    children: Snippet;
    actions?: Snippet;
  };

  let { open = $bindable(false), title, onclose, children, actions }: Props = $props();
  const componentId = $props.id();
  const titleId = `modal-title-${componentId}`;
  let dialog: HTMLDialogElement;
  let opener: HTMLElement | null = null;

  $effect(() => {
    if (open && !dialog.open) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function handleClose() {
    open = false;
    onclose?.();
    opener?.focus();
    opener = null;
  }

  function handleBackdrop(event: MouseEvent) {
    if (event.target === dialog) dialog.close();
  }
</script>

<dialog bind:this={dialog} aria-labelledby={titleId} onclose={handleClose} onclick={handleBackdrop}>
  <div class="dialog-paper">
    <header>
      <h2 id={titleId}>{title}</h2>
      <button class="close-button" type="button" aria-label={copy.common.close} onclick={() => dialog.close()}>×</button>
    </header>
    <div class="dialog-content">{@render children()}</div>
    {#if actions}<footer class="dialog-actions">{@render actions()}</footer>{/if}
  </div>
</dialog>

<style>
  dialog {
    width: min(32rem, calc(100% - 2rem));
    max-height: calc(100dvh - 2rem);
    padding: 0;
    overflow: auto;
    border: 1px solid rgb(76 52 30 / 25%);
    border-radius: 4px;
    background: var(--paper);
    box-shadow: 0 18px 55px rgb(43 33 24 / 45%);
    color: var(--ink);
  }

  dialog::backdrop {
    background: rgb(43 33 24 / 65%);
  }

  .dialog-paper {
    padding: 1.25rem;
  }

  header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 2px solid rgb(178 58 38 / 45%);
  }

  h2 {
    margin: 0 0 0.75rem;
    font-family: var(--font-heading);
    font-size: 2rem;
    line-height: 1.1;
  }

  .close-button {
    min-width: 2.75rem;
    min-height: 2.75rem;
    border: 0;
    background: transparent;
    color: var(--ink);
    font-size: 1.8rem;
    line-height: 1;
  }

  .dialog-content {
    padding-block: 1rem;
  }

  .dialog-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.65rem;
  }
</style>

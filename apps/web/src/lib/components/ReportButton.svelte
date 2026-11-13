<script lang="ts">
  import { auth } from "$lib/auth.svelte";
  import { directory } from "$lib/copy/directory";
  import { collection } from "$lib/pb";
  import type { ReportReason, ReportTargetType } from "$lib/types";
  import Modal from "$lib/components/Modal.svelte";

  type Props = {
    targetType: ReportTargetType;
    targetId: string;
    targetUser?: string | null;
    label?: string;
  };

  let {
    targetType,
    targetId,
    targetUser = null,
    label = directory.report.label,
  }: Props = $props();

  const reasons: ReportReason[] = ["spam", "scam", "harassment", "unsafe", "inappropriate", "other"];

  let open = $state(false);
  let reason = $state<ReportReason | null>(null);
  let details = $state("");
  let sending = $state(false);
  let error = $state<string | null>(null);
  let done = $state(false);

  function openDialog() {
    reason = null;
    details = "";
    error = null;
    done = false;
    open = true;
  }

  function handleClose() {
    open = false;
  }

  async function submit() {
    const me = auth.user;
    if (!me || !reason) return;

    sending = true;
    error = null;
    try {
      const body: Record<string, unknown> = {
        reporter: me.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim(),
        status: "open",
      };
      if (targetUser) body.target_user = targetUser;
      await collection("reports").create(body);
      done = true;
    } catch {
      error = directory.report.error;
    } finally {
      sending = false;
    }
  }
</script>

{#if auth.isLoggedIn}
  <button type="button" class="report-button" onclick={openDialog}>{label}</button>

  <Modal bind:open={open} title={directory.report.title(directory.report.targetType[targetType])} onclose={handleClose}>
    {#if done}
      <p class="success" role="status">{directory.report.success}</p>
      <div class="button-row actions">
        <button type="button" class="button" onclick={handleClose}>{directory.report.done}</button>
      </div>
    {:else}
      <form class="report-form" onsubmit={(event) => { event.preventDefault(); submit(); }}>
        <fieldset class="reasons">
          <legend>{directory.report.reasonLabel}</legend>
          {#each reasons as value (value)}
            <label class="reason">
              <input type="radio" name="reason" value={value} bind:group={reason} />
              <span>{directory.report.reasons[value]}</span>
            </label>
          {/each}
        </fieldset>

        <label class="field">
          <span class="field-label">{directory.report.detailsLabel}</span>
          <textarea
            bind:value={details}
            maxlength={1000}
            rows={3}
            placeholder={directory.report.detailsPlaceholder}
          ></textarea>
        </label>

        {#if error}
          <p class="error" role="alert">{error}</p>
        {/if}

        <div class="button-row actions">
          <button type="button" class="button-secondary" onclick={handleClose} disabled={sending}>
            {directory.report.cancel}
          </button>
          <button type="submit" class="button" disabled={sending || !reason}>
            {directory.report.submit}
          </button>
        </div>
      </form>
    {/if}
  </Modal>
{/if}

<style>
  .report-button {
    display: inline-flex;
    min-height: 2.4rem;
    align-items: center;
    padding: 0.4rem 0.8rem;
    border: 1.5px solid rgb(76 52 30 / 30%);
    border-radius: 4px;
    background: transparent;
    color: var(--ink-soft);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
  }

  .report-button:hover {
    border-color: var(--brick);
    color: var(--brick-dark);
  }

  .report-form {
    display: grid;
    gap: 1rem;
  }

  .reasons {
    margin: 0;
    padding: 0;
    border: 0;
  }

  .reasons legend,
  .field-label {
    display: block;
    margin: 0 0 0.4rem;
    font-weight: 700;
  }

  .reason {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0;
  }

  .reason input {
    width: 1.1rem;
    height: 1.1rem;
  }

  .field {
    display: grid;
    gap: 0.35rem;
  }

  textarea {
    width: 100%;
    min-height: 5rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: white;
    color: var(--ink);
    font: inherit;
    resize: vertical;
  }

  .error {
    margin: 0;
    padding: 0.65rem 0.75rem;
    border-left: 4px solid var(--brick);
    border-radius: 2px;
    background: var(--paper-dark);
    color: var(--brick-dark);
    font-weight: 700;
  }

  .success {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .actions {
    justify-content: flex-end;
  }
</style>

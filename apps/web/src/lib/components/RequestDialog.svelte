<script lang="ts">
  import { auth } from "$lib/auth.svelte";
  import { directory } from "$lib/copy/directory";
  import { collection, pb } from "$lib/pb";
  import type { HelpRequest, Need, Skill, User } from "$lib/types";
  import Modal from "$lib/components/Modal.svelte";

  type Props = {
    open: boolean;
    kind: "ask" | "offer";
    otherUser: User;
    skill?: Skill | null;
    need?: Need | null;
    onsent?: () => void;
  };

  let {
    open = $bindable(false),
    kind,
    otherUser,
    skill = null,
    need = null,
    onsent,
  }: Props = $props();

  const MAX_MESSAGE = 500;

  let message = $state("");
  let sending = $state(false);
  let error = $state<string | null>(null);
  let done = $state(false);

  $effect(() => {
    if (open) {
      message = "";
      error = null;
      done = false;
    }
  });

  const title = $derived(
    kind === "ask" ? directory.request.titleAsk(otherUser.name) : directory.request.titleOffer(otherUser.name),
  );

  const remaining = $derived(MAX_MESSAGE - message.length);

  function handleClose() {
    open = false;
  }

  async function submit() {
    const me = auth.user;
    if (!me) {
      error = directory.request.genericError;
      return;
    }

    const text = message.trim();
    if (!text) {
      error = directory.request.messageRequired;
      return;
    }

    if (kind === "ask" && otherUser.taking_requests === false) {
      error = directory.request.notTaking(otherUser.name);
      return;
    }

    sending = true;
    error = null;

    try {
      if (kind === "ask") {
        const existing = await collection<HelpRequest>("requests").getList(1, 1, {
          filter: pb.filter(
            'kind = "ask" && status = "pending" && seeker = {:me} && helper = {:other}',
            { me: me.id, other: otherUser.id },
          ),
        });
        if (existing.totalItems > 0) {
          error = directory.request.duplicateAsk(otherUser.name);
          return;
        }
        const body: Record<string, unknown> = {
          kind: "ask",
          seeker: me.id,
          helper: otherUser.id,
          message: text,
          status: "pending",
        };
        if (skill) body.skill = skill.id;
        await collection<HelpRequest>("requests").create(body);
      } else {
        if (!need) {
          error = directory.request.genericError;
          return;
        }
        const existing = await collection<HelpRequest>("requests").getList(1, 1, {
          filter: pb.filter(
            'kind = "offer" && (status = "pending" || status = "accepted") && helper = {:me} && need = {:need}',
            { me: me.id, need: need.id },
          ),
        });
        if (existing.totalItems > 0) {
          error = directory.request.duplicateOffer;
          return;
        }
        await collection<HelpRequest>("requests").create({
          kind: "offer",
          seeker: otherUser.id,
          helper: me.id,
          need: need.id,
          message: text,
          status: "pending",
        });
      }

      done = true;
      onsent?.();
    } catch {
      error = directory.request.genericError;
    } finally {
      sending = false;
    }
  }
</script>

<Modal bind:open title={title} onclose={handleClose}>
  {#if done}
    <p class="success" role="status">{directory.request.success}</p>
  {:else}
    <form class="request-form" onsubmit={(event) => { event.preventDefault(); submit(); }}>
      <label class="field">
        <span class="field-label">{directory.request.messageLabel}</span>
        <textarea
          bind:value={message}
          maxlength={MAX_MESSAGE}
          rows={4}
          required
          placeholder={directory.request.messagePlaceholder}
        ></textarea>
        <span class="count" aria-live="polite">{directory.request.chars(remaining)}</span>
      </label>
      <p class="privacy-note">{directory.request.privacyNote}</p>

      {#if error}
        <p class="error" role="alert">{error}</p>
      {/if}

      <div class="button-row actions">
        <button type="button" class="button-secondary" onclick={handleClose} disabled={sending}>
          {directory.request.cancel}
        </button>
        <button type="submit" class="button" disabled={sending}>
          {kind === "ask" ? directory.request.sendAsk : directory.request.sendOffer}
        </button>
      </div>
    </form>
  {/if}

  {#if done}
    <div class="button-row actions">
      <button type="button" class="button" onclick={handleClose}>{directory.request.done}</button>
    </div>
  {/if}
</Modal>

<style>
  .request-form {
    display: grid;
    gap: 0.9rem;
  }

  .field {
    display: grid;
    gap: 0.35rem;
  }

  .field-label {
    font-weight: 700;
  }

  textarea {
    width: 100%;
    min-height: 7rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--ink-soft);
    border-radius: 3px;
    background: white;
    color: var(--ink);
    font: inherit;
    resize: vertical;
  }

  .count {
    color: var(--ink-soft);
    font-size: 0.8rem;
    text-align: right;
  }

  .privacy-note {
    margin: 0;
    color: var(--ink-soft);
    font-size: 0.9rem;
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
    margin-top: 0.5rem;
  }
</style>

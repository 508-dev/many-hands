<script lang="ts">
  import { getCategory } from "$lib/categories";
  import Avatar from "$lib/components/Avatar.svelte";
  import Card from "$lib/components/Card.svelte";
  import { fill, requestsCopy } from "$lib/copy/requests";
  import { collection, pb } from "$lib/pb";
  import { timeAgo } from "$lib/time";
  import type { HelpRequest, User } from "$lib/types";
  import ContactReveal from "./ContactReveal.svelte";

  type Tab = "inbox" | "sent" | "active" | "past";

  let {
    request,
    viewerId,
    tab,
    thanked = false,
    onchange = () => {},
    onthank = () => {},
  }: {
    request: HelpRequest;
    viewerId: string;
    tab: Tab;
    thanked?: boolean;
    onchange?: () => void;
    onthank?: (request: HelpRequest) => void;
  } = $props();

  let busy = $state(false);
  let showError = $state(false);
  let confirmingDecline = $state(false);

  const viewerIsSeeker = $derived(request.seeker === viewerId);
  const other: User | undefined = $derived(
    viewerIsSeeker ? request.expand?.helper : request.expand?.seeker,
  );
  const otherName = $derived(other?.name ?? requestsCopy.someone);
  const otherAvatarUrl = $derived(
    other?.avatar ? pb.files.getURL(other, other.avatar) : undefined,
  );
  const otherContact = $derived(
    viewerIsSeeker ? request.helper_contact : request.seeker_contact,
  );

  const contextTitle = $derived.by(() => {
    const skill = request.expand?.skill;
    const need = request.expand?.need;
    if (request.kind === "ask") {
      if (skill) {
        return fill(
          viewerIsSeeker ? requestsCopy.context.askSkillTheirs : requestsCopy.context.askSkillMine,
          { name: otherName, title: skill.title },
        );
      }
      return viewerIsSeeker ? requestsCopy.context.askTheirs : requestsCopy.context.askMine;
    }
    if (need) {
      return fill(
        viewerIsSeeker
          ? requestsCopy.context.offerNeedMine
          : requestsCopy.context.offerNeedTheirs,
        { name: otherName, title: need.title },
      );
    }
    return requestsCopy.context.offerPlain;
  });

  const categoryColour = $derived(
    getCategory(request.expand?.skill?.category ?? request.expand?.need?.category ?? "other")
      .colour,
  );

  const statusLabel = $derived.by(() => {
    if (request.status === "pending") {
      return tab === "inbox"
        ? requestsCopy.status.waitingOnYou
        : requestsCopy.status.waitingReply;
    }
    return requestsCopy.status[request.status];
  });

  async function setStatus(status: "accepted" | "declined" | "withdrawn" | "done") {
    if (busy) return;
    busy = true;
    showError = false;
    confirmingDecline = false;
    try {
      await collection<HelpRequest>("requests").update(request.id, { status }, { requestKey: null });
      onchange();
      if (status === "done" && viewerIsSeeker) onthank(request);
    } catch {
      showError = true;
    }
    busy = false;
  }
</script>

<Card id={request.id} pinColour={categoryColour} eyebrow={timeAgo(request.updated)} title={contextTitle}>
  <p class="person-row">
    {#if other}
      <a class="person" href={`/people/${other.id}`}>
        <Avatar name={other.name} id={other.id} src={otherAvatarUrl} size="small" />
        <span>{other.name}</span>
      </a>
    {:else}
      <span class="person">
        <Avatar name={requestsCopy.someone} size="small" />
        <span>{requestsCopy.someone}</span>
      </span>
    {/if}
  </p>
  <blockquote class="message-quote">{request.message}</blockquote>
  <p>
    <span class={`status-chip status-${request.status}`}>{statusLabel}</span>
  </p>

  {#if tab === "active" && otherContact}
    <ContactReveal snapshot={otherContact} name={otherName} />
  {:else if tab === "active"}
    <p class="contact-missing">{requestsCopy.contact.missing}</p>
  {/if}

  {#snippet footer()}
    {#if tab === "inbox"}
      {#if confirmingDecline}
        <p class="confirm-text">{fill(requestsCopy.actions.declineConfirm, { name: otherName })}</p>
        <div class="button-row">
          <button type="button" class="button-secondary" disabled={busy} onclick={() => setStatus("declined")}>
            {requestsCopy.actions.declineYes}
          </button>
          <button type="button" class="button-secondary" disabled={busy} onclick={() => (confirmingDecline = false)}>
            {requestsCopy.actions.declineNo}
          </button>
        </div>
      {:else}
        <div class="button-row">
          <button type="button" class="button" disabled={busy} onclick={() => setStatus("accepted")}>
            {requestsCopy.actions.accept}
          </button>
          <button type="button" class="button-secondary" disabled={busy} onclick={() => (confirmingDecline = true)}>
            {requestsCopy.actions.decline}
          </button>
        </div>
      {/if}
    {:else if tab === "sent"}
      <div class="button-row">
        <button type="button" class="button-secondary" disabled={busy} onclick={() => setStatus("withdrawn")}>
          {requestsCopy.actions.withdraw}
        </button>
      </div>
    {:else if tab === "active"}
      <div class="button-row">
        <button type="button" class="button" disabled={busy} onclick={() => setStatus("done")}>
          {requestsCopy.actions.markDone}
        </button>
      </div>
    {:else if tab === "past" && request.status === "done" && viewerIsSeeker}
      {#if thanked}
        <p class="thanked-note">{fill(requestsCopy.actions.thankedNote, { name: otherName })}</p>
      {:else}
        <div class="button-row">
          <button type="button" class="button" onclick={() => onthank(request)}>
            {requestsCopy.actions.sayThanks}
          </button>
        </div>
      {/if}
    {/if}
    {#if showError}
      <p class="action-error" role="alert">{requestsCopy.actions.error}</p>
    {/if}
  {/snippet}
</Card>

<style>
  .person-row {
    margin: 0 0 0.65rem;
  }

  .person {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    color: var(--ink);
    font-weight: 700;
  }

  a.person {
    text-decoration-color: rgb(178 58 38 / 55%);
  }

  .message-quote {
    margin: 0 0 0.75rem;
    padding: 0.65rem 0.85rem;
    border-left: 4px solid rgb(178 58 38 / 45%);
    border-radius: 3px;
    background: var(--paper-dark);
    line-height: 1.5;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  .status-chip {
    display: inline-block;
    padding: 0.2rem 0.7rem;
    border: 1px solid rgb(76 52 30 / 25%);
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .status-pending {
    background: #f5e3b3;
    color: #5c4708;
  }

  .status-accepted {
    background: #d7ecd9;
    color: #2c5e2e;
  }

  .status-done {
    background: #d9e6f2;
    color: #24527a;
  }

  .status-declined,
  .status-withdrawn {
    background: #e8e0d3;
    color: var(--ink-soft);
  }

  .contact-missing,
  .action-error,
  .confirm-text,
  .thanked-note {
    margin: 0.55rem 0 0;
  }

  .action-error {
    color: var(--brick-dark);
    font-weight: 700;
  }

  .thanked-note {
    color: var(--ink-soft);
    font-weight: 700;
  }
</style>

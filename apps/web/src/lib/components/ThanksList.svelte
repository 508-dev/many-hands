<script lang="ts">
  import { directory } from "$lib/copy/directory";
  import { timeAgo } from "$lib/time";
  import type { ThankYou } from "$lib/types";

  let { thanks }: { thanks: ThankYou[] } = $props();
</script>

{#if thanks.length === 0}
  <p class="empty">{directory.thanks.empty}</p>
{:else}
  <ul class="notes">
    {#each thanks as note (note.id)}
      <li class="note">
        <p class="author">{directory.thanks.byline(note.expand?.author?.name ?? "")}</p>
        <p class="message">{note.message}</p>
        <p class="when"><time datetime={note.created}>{timeAgo(note.created)}</time></p>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .empty {
    margin: 0;
    color: var(--ink-soft);
  }

  .notes {
    display: grid;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .note {
    position: relative;
    padding: 0.9rem 1rem 1rem;
    border: 1px solid rgb(76 52 30 / 14%);
    border-radius: 3px;
    background: var(--paper);
    box-shadow: 0 3px 8px rgb(43 33 24 / 16%);
    transform: rotate(-0.4deg);
  }

  .note:nth-child(even) {
    transform: rotate(0.4deg);
  }

  .author {
    margin: 0 0 0.35rem;
    color: var(--brick-dark);
    font-weight: 700;
  }

  .message {
    margin: 0 0 0.5rem;
  }

  .when {
    margin: 0;
    color: var(--ink-soft);
    font-size: 0.82rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .note,
    .note:nth-child(even) {
      transform: none;
    }
  }
</style>

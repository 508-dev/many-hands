<script lang="ts">
  import Board from "$lib/components/Board.svelte";
  import RequestItem from "$lib/components/requests/RequestItem.svelte";
  import ThankDialog from "$lib/components/requests/ThankDialog.svelte";
  import { copy } from "$lib/copy";
  import { requestsCopy } from "$lib/copy/requests";
  import { auth } from "$lib/auth.svelte";
  import { requestInbox } from "$lib/requests.svelte";
  import type { HelpRequest } from "$lib/types";

  type TabId = "inbox" | "sent" | "active" | "past";

  const tabIds: TabId[] = ["inbox", "sent", "active", "past"];

  let activeTab = $state<TabId>("inbox");
  let thankOpen = $state(false);
  let thankTarget = $state<HelpRequest | null>(null);

  const me = $derived(auth.user?.id ?? "");
  const items = $derived(requestInbox.items);

  const inboxItems = $derived(
    items.filter(
      (request) =>
        request.status === "pending" &&
        ((request.kind === "ask" && request.helper === me) ||
          (request.kind === "offer" && request.seeker === me)),
    ),
  );
  const sentItems = $derived(
    items.filter(
      (request) =>
        request.status === "pending" &&
        ((request.kind === "ask" && request.seeker === me) ||
          (request.kind === "offer" && request.helper === me)),
    ),
  );
  const activeItems = $derived(items.filter((request) => request.status === "accepted"));
  const pastItems = $derived(
    items.filter(
      (request) => request.status !== "pending" && request.status !== "accepted",
    ),
  );

  const tabs = $derived([
    {
      id: "inbox" as TabId,
      label: requestsCopy.tabs.inbox,
      items: inboxItems,
      emptyTitle: requestsCopy.empty.inboxTitle,
      emptyText: requestsCopy.empty.inboxText,
    },
    {
      id: "sent" as TabId,
      label: requestsCopy.tabs.sent,
      items: sentItems,
      emptyTitle: requestsCopy.empty.sentTitle,
      emptyText: requestsCopy.empty.sentText,
    },
    {
      id: "active" as TabId,
      label: requestsCopy.tabs.active,
      items: activeItems,
      emptyTitle: requestsCopy.empty.activeTitle,
      emptyText: requestsCopy.empty.activeText,
    },
    {
      id: "past" as TabId,
      label: requestsCopy.tabs.past,
      items: pastItems,
      emptyTitle: requestsCopy.empty.pastTitle,
      emptyText: requestsCopy.empty.pastText,
    },
  ]);

  const activePanel = $derived(tabs.find((tab) => tab.id === activeTab) ?? tabs[0]);

  $effect(() => {
    const userId = me;
    if (userId) {
      void requestInbox.start(userId);
      return () => requestInbox.stop();
    }
    requestInbox.stop();
  });

  function selectTab(id: TabId) {
    activeTab = id;
  }

  function onTabKeydown(event: KeyboardEvent) {
    const index = tabIds.indexOf(activeTab);
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (index + 1) % tabIds.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabIds.length) % tabIds.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabIds.length - 1;
    if (next === null) return;
    event.preventDefault();
    selectTab(tabIds[next]);
    document.getElementById(`request-tab-${tabIds[next]}`)?.focus();
  }

  function openThanks(request: HelpRequest) {
    thankTarget = request;
    thankOpen = true;
  }
</script>

<svelte:head><title>{requestsCopy.title} · {copy.siteName}</title></svelte:head>

<div class="page-shell">
  <header class="paper-label">
    <h1>{requestsCopy.title}</h1>
    <p>{requestsCopy.intro}</p>
  </header>

  <div class="tabs" role="tablist" aria-label={requestsCopy.tabsLabel}>
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        role="tab"
        id={`request-tab-${tab.id}`}
        class:active={activeTab === tab.id}
        aria-selected={activeTab === tab.id}
        aria-controls={`request-panel-${tab.id}`}
        tabindex={activeTab === tab.id ? 0 : -1}
        onclick={() => selectTab(tab.id)}
        onkeydown={onTabKeydown}
      >
        {tab.label} <span class="tab-count">({tab.items.length})</span>
      </button>
    {/each}
  </div>

  <div
    role="tabpanel"
    id={`request-panel-${activeTab}`}
    aria-labelledby={`request-tab-${activeTab}`}
    tabindex="0"
    class="panel"
  >
    {#if requestInbox.failed && items.length === 0}
      <div class="paper-panel state-panel">
        <p>{requestsCopy.error}</p>
        <button type="button" class="button" onclick={() => requestInbox.refresh()}>
          {requestsCopy.retry}
        </button>
      </div>
    {:else if requestInbox.loading && items.length === 0 && !requestInbox.loaded}
      <div class="paper-panel state-panel">
        <p>{requestsCopy.loading}</p>
      </div>
    {:else if activePanel.items.length === 0}
      <div class="paper-panel state-panel">
        <h2>{activePanel.emptyTitle}</h2>
        <p>{activePanel.emptyText}</p>
        <div class="button-row">
          <a class="button" href="/skills">{requestsCopy.empty.browseSkills}</a>
        </div>
      </div>
    {:else}
      <Board label={requestsCopy.boardLabel}>
        {#each activePanel.items as request (request.id)}
          <RequestItem
            {request}
            viewerId={me}
            tab={activePanel.id}
            thanked={requestInbox.thankedIds.includes(request.id)}
            onchange={() => requestInbox.refresh()}
            onthank={openThanks}
          />
        {/each}
      </Board>
    {/if}
  </div>
</div>

<ThankDialog bind:open={thankOpen} request={thankTarget} ondone={() => requestInbox.refresh()} />

<style>
  .paper-label {
    max-width: 46rem;
  }

  .paper-label p {
    margin: 0;
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1.25rem 0 1.15rem;
  }

  .tabs button {
    min-height: 2.75rem;
    padding: 0.55rem 0.95rem;
    border: 2px solid rgb(76 52 30 / 30%);
    border-radius: 4px;
    background: var(--paper);
    color: var(--ink);
    font-weight: 700;
  }

  .tabs button:hover {
    background: var(--paper-dark);
  }

  .tabs button.active {
    border-color: var(--brick);
    background: var(--brick);
    color: white;
  }

  .tab-count {
    font-weight: 700;
  }

  .panel {
    min-width: 0;
    border-radius: 4px;
  }

  .state-panel {
    max-width: 32rem;
  }

  .state-panel h2 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
  }

  .state-panel p {
    margin: 0 0 1.15rem;
  }
</style>

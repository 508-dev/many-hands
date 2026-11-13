import type { UnsubscribeFunc } from "pocketbase";
import { collection, pb } from "./pb";
import type { HelpRequest, ThankYou } from "./types";

/** Requests waiting on me: incoming and still pending. */
function incomingPendingFilter(userId: string): string {
  return pb.filter(
    'status = "pending" && ((kind = "ask" && helper = {:me}) || (kind = "offer" && seeker = {:me}))',
    { me: userId },
  );
}

/** Every request I take part in. */
function myRequestsFilter(userId: string): string {
  return pb.filter("(seeker = {:me} || helper = {:me})", { me: userId });
}

let unreadCount = $state(0);
let unreadUserId: string | null = null;
let unreadUnsubscribe: UnsubscribeFunc | null = null;

async function refreshUnread(userId: string): Promise<void> {
  try {
    const page = await collection<HelpRequest>("requests").getList(1, 1, {
      filter: incomingPendingFilter(userId),
      // The SDK auto-cancels concurrent requests sharing a method+path key;
      // the badge and inbox queries are different views of the same path.
      requestKey: null,
    });
    if (unreadUserId === userId) unreadCount = page.totalItems;
  } catch {
    // Keep the last known count when the network hiccups.
  }
}

function stopUnread(): void {
  unreadUserId = null;
  unreadCount = 0;
  const unsubscribe = unreadUnsubscribe;
  unreadUnsubscribe = null;
  if (unsubscribe) void unsubscribe();
}

/**
 * Live count of incoming pending requests for the Nav badge. Start it when a
 * member logs in and stop it on logout.
 */
export const unreadRequests = {
  get count(): number {
    return unreadCount;
  },
  async start(userId: string): Promise<void> {
    stopUnread();
    unreadUserId = userId;
    void refreshUnread(userId);
    try {
      const unsubscribe = await collection<HelpRequest>("requests").subscribe("*", () => {
        void refreshUnread(userId);
      });
      if (unreadUserId !== userId) {
        void unsubscribe();
        return;
      }
      unreadUnsubscribe = unsubscribe;
    } catch {
      // Realtime is a bonus; the count still refreshes on page actions.
    }
  },
  stop(): void {
    stopUnread();
  },
};

let inboxUserId: string | null = null;
let items = $state<HelpRequest[]>([]);
let thankedIds = $state<string[]>([]);
let loading = $state(false);
let loaded = $state(false);
let failed = $state(false);
let inboxUnsubscribe: UnsubscribeFunc | null = null;

async function refreshInbox(userId: string): Promise<void> {
  loading = true;
  try {
    const [requests, thanks] = await Promise.all([
      collection<HelpRequest>("requests").getList(1, 200, {
        filter: myRequestsFilter(userId),
        expand: "seeker,helper,skill,need",
        sort: "-updated",
        requestKey: null,
      }),
      collection<ThankYou>("thanks").getList(1, 200, {
        filter: pb.filter("author = {:me}", { me: userId }),
        requestKey: null,
      }),
    ]);
    if (inboxUserId !== userId) return;
    items = requests.items;
    thankedIds = thanks.items.map((thank) => thank.request);
    failed = false;
    loaded = true;
  } catch {
    if (inboxUserId === userId) failed = true;
  } finally {
    if (inboxUserId === userId) loading = false;
  }
}

function stopInbox(): void {
  inboxUserId = null;
  items = [];
  thankedIds = [];
  loading = false;
  loaded = false;
  failed = false;
  const unsubscribe = inboxUnsubscribe;
  inboxUnsubscribe = null;
  if (unsubscribe) void unsubscribe();
}

/** The member's request list for the /requests page, kept live via realtime. */
export const requestInbox = {
  get items(): HelpRequest[] {
    return items;
  },
  get thankedIds(): string[] {
    return thankedIds;
  },
  get loading(): boolean {
    return loading;
  },
  get loaded(): boolean {
    return loaded;
  },
  get failed(): boolean {
    return failed;
  },
  async start(userId: string): Promise<void> {
    stopInbox();
    inboxUserId = userId;
    void refreshInbox(userId);
    try {
      const unsubscribe = await collection<HelpRequest>("requests").subscribe("*", () => {
        void refreshInbox(userId);
      });
      if (inboxUserId !== userId) {
        void unsubscribe();
        return;
      }
      inboxUnsubscribe = unsubscribe;
    } catch {
      // The list still works without realtime.
    }
  },
  refresh(): void {
    if (inboxUserId) void refreshInbox(inboxUserId);
  },
  stop(): void {
    stopInbox();
  },
};

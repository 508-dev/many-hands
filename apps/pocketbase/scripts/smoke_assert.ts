// smoke_assert.ts — run against a live Many Hands PocketBase server.
//
// Invoked by scripts/smoke.sh (which downloads the pinned binary, starts it on
// a random port with a throwaway data dir and this repo's migrations/hooks,
// and creates the superuser). This script asserts the schema, access rules and
// hooks described in docs/architecture.md -> "4. Smoke test". Exits non-zero on
// the first failure.
//
// Requires: bun. No external dependencies (fetch only).

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing env ${name}`);
  return value;
}

const PB_URL = requireEnv("PB_URL");
const SUPERUSER_EMAIL = requireEnv("PB_SUPERUSER_EMAIL");
const SUPERUSER_PASSWORD = requireEnv("PB_SUPERUSER_PASSWORD");

let failures = 0;

function check(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    failures++;
    console.log(`  ✗ ${msg}`);
  }
}

interface Resp {
  status: number;
  ok: boolean;
  data: any;
}

async function req(
  method: string,
  path: string,
  opts: {
    token?: string;
    json?: unknown;
    form?: FormData;
    query?: Record<string, string>;
  } = {},
): Promise<Resp> {
  let url = `${PB_URL}${path}`;
  if (opts.query) url += `?${new URLSearchParams(opts.query)}`;
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = opts.token;
  let body: BodyInit | undefined;
  if (opts.form !== undefined) {
    body = opts.form; // multipart; boundary added automatically
  } else if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }
  const res = await fetch(url, { method, headers, body });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body
  }
  return { status: res.status, ok: res.ok, data };
}

async function authUser(email: string, password: string) {
  const r = await req("POST", "/api/collections/users/auth-with-password", {
    json: { identity: email, password },
  });
  if (r.status !== 200) {
    throw new Error(`user auth failed for ${email}: ${r.status} ${JSON.stringify(r.data)}`);
  }
  return { token: r.data.token as string, record: r.data.record };
}

async function authSuperuser(): Promise<string> {
  const r = await req("POST", "/api/collections/_superusers/auth-with-password", {
    json: { identity: SUPERUSER_EMAIL, password: SUPERUSER_PASSWORD },
  });
  if (r.status !== 200) {
    throw new Error(`superuser auth failed: ${r.status} ${JSON.stringify(r.data)}`);
  }
  return r.data.token as string;
}

// Minimal 1x1 JPEG (valid JFIF).
const JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

function jpegBlob(): Blob {
  const bin = atob(JPEG_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/jpeg" });
}

async function main() {
  console.log(`\nTarget: ${PB_URL}`);
  const superToken = await authSuperuser();

  // -------------------------------------------------------------------------
  // 1. Collections exist
  // -------------------------------------------------------------------------
  console.log("\n[collections]");
  {
    const r = await req("GET", "/api/collections", {
      token: superToken,
      query: { perPage: "200" },
    });
    const names = new Set((r.data?.items ?? []).map((c: any) => c.name));
    for (const n of [
      "users",
      "contacts",
      "skills",
      "needs",
      "requests",
      "thanks",
      "reports",
      "helper_stats",
    ]) {
      check(names.has(n), `collection "${n}" exists`);
    }
  }

  // -------------------------------------------------------------------------
  // 1b. Settings
  // -------------------------------------------------------------------------
  console.log("\n[settings]");
  {
    const r = await req("GET", "/api/settings", { token: superToken });
    check(r.ok, "superuser can read /api/settings");
    if (r.ok) {
      check(r.data?.meta?.appName === "Many Hands", "app name is 'Many Hands'");
      check(r.data?.meta?.appURL === "https://manyhands.508.dev", "app URL is set");
      check(r.data?.backups?.cron === "", "scheduled backups are disabled");
      check(
        Array.isArray(r.data?.trustedProxy?.headers) &&
          r.data.trustedProxy.headers.includes("X-Forwarded-For"),
        "trusted proxy trusts X-Forwarded-For",
      );
      check(r.data?.trustedProxy?.useLeftmostIP === false, "trusted proxy uses the rightmost IP");
      check(r.data?.rateLimits?.enabled === true, "rate limits are enabled");
      const signupRule = (r.data?.rateLimits?.rules ?? []).find(
        (x: any) => x.label === "users:create" && x.audience === "@guest",
      );
      check(
        signupRule && signupRule.maxRequests === 5 && signupRule.duration === 600,
        "a stricter guest sign-up rate limit is configured",
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. Sign-up rules: adult attestation + honeypot
  // -------------------------------------------------------------------------
  console.log("\n[sign-up rules]");
  {
    const noAdult = await req("POST", "/api/collections/users/records", {
      json: {
        email: "noadult@example.com",
        password: "noadult-pass-123",
        passwordConfirm: "noadult-pass-123",
        name: "No Adult",
      },
    });
    check(!noAdult.ok, `sign-up without adult=true is rejected (${noAdult.status})`);

    const adultFalse = await req("POST", "/api/collections/users/records", {
      json: {
        email: "adultfalse@example.com",
        password: "adultfalse-pass-123",
        passwordConfirm: "adultfalse-pass-123",
        name: "Adult False",
        adult: false,
      },
    });
    check(!adultFalse.ok, `sign-up with adult=false is rejected (${adultFalse.status})`);

    const honeypot = await req("POST", "/api/collections/users/records", {
      json: {
        email: "bot@example.com",
        password: "bot-pass-123",
        passwordConfirm: "bot-pass-123",
        name: "Bot",
        adult: true,
        website: "http://spam.example",
      },
    });
    check(!honeypot.ok, `sign-up with a filled website honeypot is rejected (${honeypot.status})`);

    const suspended = await req("POST", "/api/collections/users/records", {
      json: {
        email: "selfsuspend@example.com",
        password: "selfsuspend-pass-123",
        passwordConfirm: "selfsuspend-pass-123",
        name: "Self Suspend",
        adult: true,
        suspended: true,
      },
    });
    check(!suspended.ok, `sign-up writing suspended=true is rejected (${suspended.status})`);
  }

  // -------------------------------------------------------------------------
  // 3. Create the members
  // -------------------------------------------------------------------------
  console.log("\n[members]");
  let alice: any;
  let bob: any;
  let charlie: any;
  let dave: any;
  {
    const s = (email: string, password: string, name: string) =>
      req("POST", "/api/collections/users/records", {
        json: { email, password, passwordConfirm: password, name, adult: true },
      });

    const a = await s("alice@example.com", "alice-pass-1234", "Alice");
    const b = await s("bob@example.com", "bob-pass-1234", "Bob");
    const c = await s("charlie@example.com", "charlie-pass-1234", "Charlie");
    const d = await s("dave@example.com", "dave-pass-1234", "Dave");

    check(a.ok && !!a.data?.id, "alice signs up");
    check(b.ok && !!b.data?.id, "bob signs up");
    check(c.ok && !!c.data?.id, "charlie signs up");
    check(d.ok && !!d.data?.id, "dave signs up");

    // The hook defaults taking_requests to true.
    check(a.data?.taking_requests === true, "taking_requests defaults to true on sign-up");

    alice = a.data;
    bob = b.data;
    charlie = c.data;
    dave = d.data;
  }

  const aliceTok = (await authUser("alice@example.com", "alice-pass-1234")).token;
  const bobTok = (await authUser("bob@example.com", "bob-pass-1234")).token;
  const charlieTok = (await authUser("charlie@example.com", "charlie-pass-1234")).token;
  const daveTok = (await authUser("dave@example.com", "dave-pass-1234")).token;

  // -------------------------------------------------------------------------
  // 4. Guest browsing: public lists, no emails, no contacts
  // -------------------------------------------------------------------------
  console.log("\n[guest browsing]");
  {
    const users = await req("GET", "/api/collections/users/records", {
      query: { perPage: "50" },
    });
    check(users.ok, `guest can list users (${users.status})`);
    const emailsLeaked = (users.data?.items ?? []).some((u: any) => u.email);
    check(!emailsLeaked, "guest users list never exposes emails");

    const skills = await req("GET", "/api/collections/skills/records", {});
    check(skills.ok, `guest can list skills (${skills.status})`);
    const needs = await req("GET", "/api/collections/needs/records", {});
    check(needs.ok, `guest can list needs (${needs.status})`);
    const thanks = await req("GET", "/api/collections/thanks/records", {});
    check(thanks.ok, `guest can list thanks (${thanks.status})`);

    const contacts = await req("GET", "/api/collections/contacts/records", {
      query: { perPage: "50" },
    });
    const contactItems = contacts.data?.items ?? [];
    check(contacts.ok && contactItems.length === 0, "guest cannot list any contacts (empty list)");

    const reports = await req("GET", "/api/collections/reports/records", {});
    check(!reports.ok, `guest cannot list reports (${reports.status})`);
  }

  // -------------------------------------------------------------------------
  // 5. Contacts: owner-only
  // -------------------------------------------------------------------------
  console.log("\n[contacts]");
  let aliceContact: any;
  let _bobContact: any;
  {
    const a = await req("POST", "/api/collections/contacts/records", {
      token: aliceTok,
      json: { user: alice.id, method: "email", value: "alice@example.com", note: "Evenings best" },
    });
    check(a.ok && !!a.data?.id, "alice creates her contact");
    aliceContact = a.data;

    const b = await req("POST", "/api/collections/contacts/records", {
      token: bobTok,
      json: { user: bob.id, method: "phone", value: "+15551234", note: "" },
    });
    check(b.ok && !!b.data?.id, "bob creates his contact");
    _bobContact = b.data;

    // Forging a contact for someone else is rejected.
    const forge = await req("POST", "/api/collections/contacts/records", {
      token: aliceTok,
      json: { user: bob.id, method: "phone", value: "000", note: "" },
    });
    check(!forge.ok, `creating a contact for another member is rejected (${forge.status})`);

    // Alice can only list her own contacts.
    const list = await req("GET", "/api/collections/contacts/records", {
      token: aliceTok,
      query: { perPage: "50" },
    });
    const ids = (list.data?.items ?? []).map((c: any) => c.id);
    check(
      list.ok && ids.length === 1 && ids[0] === aliceContact.id,
      "a member lists only their own contact",
    );
  }

  // -------------------------------------------------------------------------
  // 6. Cross-account protections (skills, needs, contacts, profile)
  // -------------------------------------------------------------------------
  console.log("\n[cross-account protections]");
  let aliceSkill: any;
  {
    const s = await req("POST", "/api/collections/skills/records", {
      token: aliceTok,
      json: {
        user: alice.id,
        category: "building",
        title: "Patching drywall",
        description: "Taping, mudding, sanding.",
        mode: "in_person",
      },
    });
    check(s.ok && !!s.data?.id, "alice creates a skill");
    aliceSkill = s.data;

    // Alice cannot write to Bob's skill (she doesn't have one, so forge a
    // create with bob's id is rejected).
    const forge = await req("POST", "/api/collections/skills/records", {
      token: aliceTok,
      json: { user: bob.id, category: "tech", title: "Forged", mode: "remote" },
    });
    check(!forge.ok, `creating a skill for another member is rejected (${forge.status})`);

    // Alice cannot edit/delete her own skill on Bob's behalf (nothing to cross
    // here), so test editing Bob's need below once needs exist. Also: Alice
    // cannot set suspended on herself.
    const selfSuspend = await req("PATCH", `/api/collections/users/records/${alice.id}`, {
      token: aliceTok,
      json: { suspended: true },
    });
    check(!selfSuspend.ok, `a member cannot set suspended on themselves (${selfSuspend.status})`);

    // Alice cannot un-set adult.
    const unAdult = await req("PATCH", `/api/collections/users/records/${alice.id}`, {
      token: aliceTok,
      json: { adult: false },
    });
    check(!unAdult.ok, `a member cannot un-set adult (${unAdult.status})`);
  }

  let aliceNeed: any;
  let closedNeed: any;
  {
    const n = await req("POST", "/api/collections/needs/records", {
      token: aliceTok,
      json: {
        user: alice.id,
        title: "Need help moving a sofa",
        category: "moving",
        mode: "in_person",
        status: "open",
      },
    });
    check(n.ok && !!n.data?.id, "alice creates an open need");
    aliceNeed = n.data;

    const n2 = await req("POST", "/api/collections/needs/records", {
      token: aliceTok,
      json: {
        user: alice.id,
        title: "Need help filing taxes",
        category: "money",
        mode: "remote",
        status: "open",
      },
    });
    check(n2.ok && !!n2.data?.id, "alice creates a second need");
    closedNeed = n2.data;

    const closed = await req("PATCH", `/api/collections/needs/records/${closedNeed.id}`, {
      token: aliceTok,
      json: { status: "closed" },
    });
    check(closed.ok && closed.data?.status === "closed", "alice closes the second need");

    // Bob cannot edit Alice's need.
    const edit = await req("PATCH", `/api/collections/needs/records/${aliceNeed.id}`, {
      token: bobTok,
      json: { title: "hijacked" },
    });
    check(!edit.ok, `editing another member's need is rejected (${edit.status})`);

    // Bob cannot delete Alice's skill.
    const del = await req("DELETE", `/api/collections/skills/records/${aliceSkill.id}`, {
      token: bobTok,
    });
    check(!del.ok, `deleting another member's skill is rejected (${del.status})`);

    // Bob cannot edit Alice's contact.
    const editContact = await req("PATCH", `/api/collections/contacts/records/${aliceContact.id}`, {
      token: bobTok,
      json: { value: "hijacked" },
    });
    check(!editContact.ok, `editing another member's contact is rejected (${editContact.status})`);

    // Bob cannot edit Alice's profile.
    const editProfile = await req("PATCH", `/api/collections/users/records/${alice.id}`, {
      token: bobTok,
      json: { name: "Hijacked" },
    });
    check(!editProfile.ok, `editing another member's profile is rejected (${editProfile.status})`);
  }

  // -------------------------------------------------------------------------
  // 7. Suspension
  // -------------------------------------------------------------------------
  console.log("\n[suspension]");
  {
    // Dave posts a skill and a need so we can prove they vanish.
    const ds = await req("POST", "/api/collections/skills/records", {
      token: daveTok,
      json: { user: dave.id, category: "music", title: "Guitar lessons", mode: "either" },
    });
    const dn = await req("POST", "/api/collections/needs/records", {
      token: daveTok,
      json: {
        user: dave.id,
        title: "Need a lift",
        category: "moving",
        mode: "in_person",
        status: "open",
      },
    });
    check(ds.ok && dn.ok, "dave posts a skill and a need");

    const before = await req("GET", "/api/collections/users/records", {
      query: { perPage: "50" },
    });
    check(
      (before.data?.items ?? []).some((u: any) => u.id === dave.id),
      "dave is listed before suspension",
    );

    const suspend = await req("PATCH", `/api/collections/users/records/${dave.id}`, {
      token: superToken,
      json: { suspended: true },
    });
    check(suspend.ok && suspend.data?.suspended === true, "superuser suspends dave");

    const relogin = await req("POST", "/api/collections/users/auth-with-password", {
      json: { identity: "dave@example.com", password: "dave-pass-1234" },
    });
    check(!relogin.ok, `a suspended member cannot log in (${relogin.status})`);

    const after = await req("GET", "/api/collections/users/records", {
      query: { perPage: "50" },
    });
    check(
      !(after.data?.items ?? []).some((u: any) => u.id === dave.id),
      "a suspended member vanishes from the users list",
    );

    const skills = await req("GET", "/api/collections/skills/records", {
      query: { perPage: "50" },
    });
    check(
      !(skills.data?.items ?? []).some((s: any) => s.user === dave.id),
      "a suspended member's skills vanish from public lists",
    );

    const needs = await req("GET", "/api/collections/needs/records", {
      query: { perPage: "50" },
    });
    check(
      !(needs.data?.items ?? []).some((n: any) => n.user === dave.id),
      "a suspended member's needs vanish from public lists",
    );
  }

  // -------------------------------------------------------------------------
  // 8. Request flow: ask -> accept reveals snapshots; third member sees nothing
  // -------------------------------------------------------------------------
  console.log("\n[request flow]");
  let req1: any;
  {
    const r = await req("POST", "/api/collections/requests/records", {
      token: aliceTok,
      json: {
        kind: "ask",
        seeker: alice.id,
        helper: bob.id,
        skill: aliceSkill.id,
        message: "Can you help me patch my wall?",
        status: "pending",
      },
    });
    check(r.ok && !!r.data?.id, "alice (seeker) asks bob (helper)");
    req1 = r.data;
    check(req1.status === "pending", "new request is pending");
    check(
      req1.seeker_contact === null && req1.helper_contact === null,
      "contact snapshots are empty on create",
    );
  }

  {
    // Illegal transitions while pending.
    // recipient (bob) cannot withdraw.
    const r = await req("PATCH", `/api/collections/requests/records/${req1.id}`, {
      token: bobTok,
      json: { status: "withdrawn" },
    });
    check(!r.ok, `recipient cannot withdraw (${r.status})`);

    // initiator (alice) cannot accept.
    const r2 = await req("PATCH", `/api/collections/requests/records/${req1.id}`, {
      token: aliceTok,
      json: { status: "accepted" },
    });
    check(!r2.ok, `initiator cannot accept (${r2.status})`);

    // pending -> done is illegal.
    const r3 = await req("PATCH", `/api/collections/requests/records/${req1.id}`, {
      token: bobTok,
      json: { status: "done" },
    });
    check(!r3.ok, `pending -> done is rejected (${r3.status})`);

    // writing a contact snapshot is rejected by the update rule.
    const r4 = await req("PATCH", `/api/collections/requests/records/${req1.id}`, {
      token: bobTok,
      json: { status: "accepted", helper_contact: { method: "phone", value: "spoof" } },
    });
    check(!r4.ok, `writing a *_contact snapshot on update is rejected (${r4.status})`);
  }

  {
    // Recipient (bob) accepts.
    const r = await req("PATCH", `/api/collections/requests/records/${req1.id}`, {
      token: bobTok,
      json: { status: "accepted" },
    });
    check(r.ok && r.data?.status === "accepted", "recipient accepts the ask");

    const sc = r.data?.seeker_contact;
    const hc = r.data?.helper_contact;
    check(
      sc &&
        sc.method === "email" &&
        sc.value === "alice@example.com" &&
        sc.note === "Evenings best",
      "accepted request snapshots the seeker's contact",
    );
    check(
      hc && hc.method === "phone" && hc.value === "+15551234",
      "accepted request snapshots the helper's contact",
    );
  }

  {
    // Both participants can read the request and see the snapshots; a third
    // member sees nothing.
    const a = await req("GET", `/api/collections/requests/records/${req1.id}`, { token: aliceTok });
    check(
      a.ok && a.data?.seeker_contact?.value === "alice@example.com",
      "seeker sees the snapshots",
    );

    const b = await req("GET", `/api/collections/requests/records/${req1.id}`, { token: bobTok });
    check(b.ok && b.data?.helper_contact?.value === "+15551234", "helper sees the snapshots");

    const c = await req("GET", `/api/collections/requests/records/${req1.id}`, {
      token: charlieTok,
    });
    check(!c.ok, `a third member cannot read the request (${c.status})`);

    const g = await req("GET", `/api/collections/requests/records/${req1.id}`, {});
    check(!g.ok, `a guest cannot read the request (${g.status})`);
  }

  {
    // Re-opening an accepted request is illegal.
    const r = await req("PATCH", `/api/collections/requests/records/${req1.id}`, {
      token: aliceTok,
      json: { status: "pending" },
    });
    check(!r.ok, `accepted -> pending (re-open) is rejected (${r.status})`);

    // Either participant can mark it done.
    const done = await req("PATCH", `/api/collections/requests/records/${req1.id}`, {
      token: bobTok,
      json: { status: "done" },
    });
    check(done.ok && done.data?.status === "done", "either participant marks the request done");

    // done -> anything is illegal.
    const reopen = await req("PATCH", `/api/collections/requests/records/${req1.id}`, {
      token: aliceTok,
      json: { status: "accepted" },
    });
    check(!reopen.ok, `done -> accepted (re-open) is rejected (${reopen.status})`);
  }

  // -------------------------------------------------------------------------
  // 9. Duplicate pending ask; taking_requests=false; offers
  // -------------------------------------------------------------------------
  console.log("\n[ask/offer constraints]");
  let dupAsk: any;
  {
    // A second ask from alice to bob is now allowed (req1 is done); a third is not.
    const r = await req("POST", "/api/collections/requests/records", {
      token: aliceTok,
      json: {
        kind: "ask",
        seeker: alice.id,
        helper: bob.id,
        message: "Second ask",
        status: "pending",
        // spoofed snapshots must be stripped by the hook
        seeker_contact: { method: "phone", value: "spoof" },
        helper_contact: { method: "phone", value: "spoof" },
      },
    });
    check(r.ok && !!r.data?.id, "a second pending ask is allowed");
    dupAsk = r.data;
    check(
      dupAsk.seeker_contact === null && dupAsk.helper_contact === null,
      "spoofed *_contact on create is stripped",
    );

    const dup = await req("POST", "/api/collections/requests/records", {
      token: aliceTok,
      json: {
        kind: "ask",
        seeker: alice.id,
        helper: bob.id,
        message: "Duplicate pending ask",
        status: "pending",
      },
    });
    check(!dup.ok, `a duplicate pending ask is rejected (${dup.status})`);
  }

  {
    // Asking someone with taking_requests = false fails.
    await req("PATCH", `/api/collections/users/records/${bob.id}`, {
      token: superToken,
      json: { taking_requests: false },
    });
    const r = await req("POST", "/api/collections/requests/records", {
      token: aliceTok,
      json: {
        kind: "ask",
        seeker: alice.id,
        helper: bob.id,
        message: "to a closed door",
        status: "pending",
      },
    });
    check(!r.ok, `asking someone with taking_requests=false is rejected (${r.status})`);
    await req("PATCH", `/api/collections/users/records/${bob.id}`, {
      token: superToken,
      json: { taking_requests: true },
    });
  }

  {
    // Offers: bob offers on alice's open need (valid).
    const offer = await req("POST", "/api/collections/requests/records", {
      token: bobTok,
      json: {
        kind: "offer",
        seeker: alice.id,
        helper: bob.id,
        need: aliceNeed.id,
        message: "I can help you move the sofa",
        status: "pending",
      },
    });
    check(offer.ok && !!offer.data?.id, "bob (helper) offers on alice's open need");

    // Offering on your own need fails.
    const own = await req("POST", "/api/collections/requests/records", {
      token: aliceTok,
      json: {
        kind: "offer",
        seeker: alice.id,
        helper: alice.id,
        need: aliceNeed.id,
        message: "self offer",
        status: "pending",
      },
    });
    check(!own.ok, `offering on your own need is rejected (${own.status})`);

    // Offering on a closed need fails.
    const closed = await req("POST", "/api/collections/requests/records", {
      token: bobTok,
      json: {
        kind: "offer",
        seeker: alice.id,
        helper: bob.id,
        need: closedNeed.id,
        message: "closed offer",
        status: "pending",
      },
    });
    check(!closed.ok, `offering on a closed need is rejected (${closed.status})`);
  }

  // -------------------------------------------------------------------------
  // 10. Thanks
  // -------------------------------------------------------------------------
  console.log("\n[thanks]");
  let _thanksRecord: any;
  {
    // Seeker of a done request thanks its helper.
    const t = await req("POST", "/api/collections/thanks/records", {
      token: aliceTok,
      json: { request: req1.id, author: alice.id, helper: bob.id, message: "Bob was great!" },
    });
    check(t.ok && !!t.data?.id, "seeker of a done request can thank the helper");
    _thanksRecord = t.data;

    // The helper (not the seeker) cannot thank.
    const byHelper = await req("POST", "/api/collections/thanks/records", {
      token: bobTok,
      json: { request: req1.id, author: bob.id, helper: bob.id, message: "self-thanks" },
    });
    check(!byHelper.ok, `a non-seeker cannot thank (${byHelper.status})`);

    // A third member cannot thank.
    const byThird = await req("POST", "/api/collections/thanks/records", {
      token: charlieTok,
      json: { request: req1.id, author: charlie.id, helper: bob.id, message: "drive-by thanks" },
    });
    check(!byThird.ok, `a third member cannot thank (${byThird.status})`);

    // Second thanks on the same request is rejected (unique index).
    const again = await req("POST", "/api/collections/thanks/records", {
      token: aliceTok,
      json: { request: req1.id, author: alice.id, helper: bob.id, message: "Thank you again" },
    });
    check(!again.ok, `a second thanks on the same request is rejected (${again.status})`);

    // Thanks on a non-done request is rejected.
    const pending = await req("POST", "/api/collections/thanks/records", {
      token: aliceTok,
      json: { request: dupAsk.id, author: alice.id, helper: bob.id, message: "too soon" },
    });
    check(!pending.ok, `thanking on a non-done request is rejected (${pending.status})`);
  }

  // -------------------------------------------------------------------------
  // 11. helper_stats
  // -------------------------------------------------------------------------
  console.log("\n[helper_stats]");
  {
    const r = await req("GET", "/api/collections/helper_stats/records", {
      query: { perPage: "50" },
    });
    check(r.ok, `helper_stats is readable (${r.status})`);
    const row = (r.data?.items ?? []).find((h: any) => h.id === bob.id);
    check(!!row, "helper_stats has a row for bob");
    if (row) {
      check(row.helped_count === 1, `bob's helped_count is 1 (got ${row.helped_count})`);
      check(row.thanks_count === 1, `bob's thanks_count is 1 (got ${row.thanks_count})`);
    }
    // Only id/helped_count/thanks_count are exposed.
    const keys = row ? Object.keys(row).sort() : [];
    check(
      row && !keys.includes("email") && !keys.includes("name"),
      "helper_stats exposes only id + counts",
    );
  }

  // -------------------------------------------------------------------------
  // 12. Reports
  // -------------------------------------------------------------------------
  console.log("\n[reports]");
  {
    const r = await req("POST", "/api/collections/reports/records", {
      token: charlieTok,
      json: {
        reporter: charlie.id,
        target_type: "user",
        target_id: alice.id,
        reason: "spam",
        details: "looks suspicious",
        status: "open",
      },
    });
    check(r.ok && !!r.data?.id, "a member can create a report");

    const guest = await req("GET", "/api/collections/reports/records", {});
    check(!guest.ok, `a guest cannot read reports (${guest.status})`);

    const member = await req("GET", "/api/collections/reports/records", { token: charlieTok });
    check(!member.ok, `a member cannot read reports (${member.status})`);

    const sup = await req("GET", "/api/collections/reports/records", { token: superToken });
    check(sup.ok && (sup.data?.totalItems ?? 0) >= 1, "a superuser can read reports");
  }

  // -------------------------------------------------------------------------
  // 13. Avatar upload (enumerated image MIME types)
  // -------------------------------------------------------------------------
  console.log("\n[avatar upload]");
  {
    const form = new FormData();
    form.append("avatar", jpegBlob(), "photo.jpg");
    const ok = await req("PATCH", `/api/collections/users/records/${alice.id}`, {
      token: aliceTok,
      form,
    });
    // maxSelect=1 file fields return the filename as a string.
    const avatar = ok.data?.avatar;
    check(ok.ok && typeof avatar === "string" && avatar.length > 0, "a JPEG avatar uploads");

    const badForm = new FormData();
    badForm.append("avatar", new Blob(["not an image"], { type: "text/plain" }), "notes.txt");
    const bad = await req("PATCH", `/api/collections/users/records/${alice.id}`, {
      token: aliceTok,
      form: badForm,
    });
    check(!bad.ok, `a non-image avatar is rejected (${bad.status})`);
  }

  console.log(failures === 0 ? "\nAll assertions passed." : `\n${failures} assertion(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`\nfatal: ${e.message ?? e}`);
  process.exit(1);
});

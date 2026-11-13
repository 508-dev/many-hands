# PocketBase backend

Many Hands' backend: a single pinned [PocketBase](https://pocketbase.io) release
whose schema, access rules, hooks and settings all live in versioned files in
this directory — never edited by hand in the dashboard.

The data model and rules are the source of truth in
[`../../docs/architecture.md`](../../docs/architecture.md) → "3. Data model".

- **Version:** PocketBase `v0.40.6` (pinned and checksum-verified in
  `scripts/get-pocketbase.sh`).
- **Layout:**
  - `pb_migrations/` — collections, fields, rules, indexes, settings (JS).
  - `pb_hooks/` — the `requests` contact-snapshot hook and the `users`
    honeypot / `taking_requests` default.
  - `scripts/get-pocketbase.sh` — downloads the pinned binary into `../../.bin/`.
  - `scripts/smoke.sh` + `scripts/smoke_assert.ts` — end-to-end rule test.

## Collections

| collection | type | notes |
| --- | --- | --- |
| `users` | auth | built-in, modified. Public sign-up (18+ `adult` attestation, honeypot). `suspended` hides a member and blocks login. Emails never public. |
| `contacts` | base | one private contact method per member. **Owner-only for every operation.** |
| `skills` | base | public to browse; owner writes. |
| `needs` | base | public to browse; owner writes; always created `open`. |
| `requests` | base | the connection between a `seeker` and `helper`. Participants-only; strict status state machine; contact snapshots are server-set. |
| `thanks` | base | public thank-you notes. Only the seeker of a `done` request can thank its helper, once. |
| `helper_stats` | view | public; `id`, `helped_count`, `thanks_count` per member. |
| `reports` | base | abuse reports. Members create; superusers moderate. |

All base collections carry explicit `created`/`updated` autodate fields.

## Access rules (summary)

- `users`: `list`/`view` hide `suspended` members; `create` is public but rejects
  `suspended` in the body; `update`/`delete` are self-only and reject
  `suspended`/`adult` changes; `authRule` blocks suspended logins.
- `contacts`: `user = @request.auth.id` for every operation — nobody else can
  ever read this collection.
- `skills` / `needs`: `user.suspended = false` to read; owner-only to write.
- `requests`: participants-only read; create enforces the ask/offer invariants
  (taking_requests, suspension, need ownership + openness); update enforces the
  transition table and freezes `kind`, `seeker`, `helper`, `skill`, `need`,
  `message` and both contact snapshots.
- `thanks`: public read (unless either party is suspended); create requires the
  author to be the `done` request's seeker thanking that request's helper.
- `reports`: create-only for members; read/update/delete are superuser-only.

## Hooks

- `pb_hooks/requests.pb.js` — forces the contact snapshots empty on create, and
  on the `pending → accepted` transition snapshots each side's `contacts`
  record (falling back to `{ method: "email", value: <account email> }`). All
  other updates restore the stored values, so clients can never write them.
- `pb_hooks/users.pb.js` — rejects sign-ups carrying a non-empty `website`
  honeypot field, and defaults `taking_requests` to `true`.

## Settings

`appName` "Many Hands", `appURL` `https://manyhands.508.dev`, no scheduled
backups, SMTP off, trusted proxy `X-Forwarded-For` (rightmost IP), rate limits
enabled with a stricter guest `users:create` rule (5 per 10 minutes per IP).

## Run the smoke test

```bash
apps/pocketbase/scripts/smoke.sh
```

It downloads the pinned binary if missing (checksum-verified), starts PocketBase
on a random free port with a throwaway data dir and this repo's migrations and
hooks, creates a superuser with the CLI, runs `scripts/smoke_assert.ts` with bun
(no dependencies), then restarts on the same dir to prove a clean re-open.
Requires `curl`, `jq`, `bun`, `sha256sum`, `unzip`. It exits non-zero on any
failure and always cleans up.

## Deviations from docs/architecture.md

1. **`helper_stats` SQL is a `LEFT JOIN` + `GROUP BY` instead of scalar
   subqueries.** PocketBase cannot infer the scalar-subquery columns as
   integers (it falls back to `json`); the JOIN form lets `createViewFields`
   infer `helped_count`/`thanks_count` as `number` fields while returning
   identical counts (`COUNT(DISTINCT r.seeker)` over `LEFT JOIN requests` and
   `COUNT(DISTINCT t.id)` over `LEFT JOIN thanks`). The UI can still read both
   as numbers.
2. **`127.0.0.1` is in `rateLimits.excludedIPs`.** Local dev, health checks and
   the smoke test hit PocketBase directly on loopback and would otherwise be
   throttled by the (intentionally aggressive) defaults. Real clients arrive via
   Traefik and are rate-limited against the IP from `X-Forwarded-For`, which is
   never `127.0.0.1`.
3. **Requests create rule uses bare relation traversal** (`helper.taking_requests`,
   `helper.suspended`, `need.user`, `need.status`) rather than
   `@request.body.helper.*`. Both forms evaluate correctly in v0.40.6 (verified
   empirically); the bare form is used for consistency with the list/view rules.
4. **Hook implementation note:** top-level function/`const` declarations in a
   `pb_hooks/*.pb.js` file are **not** visible inside the registered handlers in
   this version, so the snapshot helper is defined inside the handler.

# Architecture

This is the contract every change builds against. Product intent is in
[`../DECISIONS.md`](../DECISIONS.md). If code and this document disagree, fix
one of them in the same PR.

## 1. Shape

```text
 Browser (phone first)
   |  https://manyhands.508.dev   (Coolify Traefik, TLS)
   v
 one container: PocketBase 0.40.6 on :8090
   /api/*   REST + realtime (SSE)      -> SQLite in /pb/pb_data (persistent volume)
   /_/      admin dashboard (superusers = moderators)
   /*       SvelteKit SPA from /pb/pb_public, index.html fallback for client routes
```

- PocketBase serves `pb_public` with `--indexFallback` (default on), so client
  routes like `/needs/abc` load `index.html`.
- Same origin: the SPA calls PocketBase at `/` with the JS SDK. No CORS config.
- Migrations (`pb_migrations/`) and hooks (`pb_hooks/`) are baked into the image
  and applied on start (`--automigrate` default on).

## 2. Repository layout

```text
apps/web/                 SvelteKit 2 SPA (adapter-static, ssr = false)
  src/lib/pb.ts           PocketBase client singleton (+ typed collection helpers)
  src/lib/auth.svelte.ts  reactive current user (Svelte 5 runes) from pb.authStore
  src/lib/copy.ts         ALL user-facing wording
  src/lib/categories.ts   the 15 categories (slug, label, emoji, colour)
  src/lib/geo.ts          Photon place search, haversine, bounding box
  src/lib/types.ts        record types for every collection
  src/lib/components/     shared UI (Card, Board, Avatar, PlacePicker, Modal, ...)
  src/routes/             pages (see section 6)
  static/                 robots.txt, manifest.webmanifest, icons
apps/pocketbase/
  pb_migrations/          schema, rules, indexes, settings (JS migrations)
  pb_hooks/               server-side hooks (*.pb.js)
  scripts/smoke.sh        runs PocketBase on a temp dir and asserts the rules
  scripts/smoke_assert.ts the assertions (bun, no dependencies)
Dockerfile                stage 1: bun builds apps/web; stage 2: PocketBase + pb_public
docker-entrypoint.sh      upserts the superuser from env, then `pocketbase serve`
docs/                     architecture (this), deployment, development
```

Versions: PocketBase **0.40.6** (pinned, checksum-verified download), JS SDK
`pocketbase` 0.28 or 0.29, SvelteKit **2.x** (not 3), `@sveltejs/adapter-static`
3.x, Svelte 5, Vite 8, `@sveltejs/vite-plugin-svelte` 7, TypeScript **6.x** (not 7:
svelte-check does not support it), Bun 1.4. `bunfig.toml` enforces a 7-day
release-age cooldown; let Bun resolve versions.

## 3. Data model

All collections are created by migrations. Every base collection has explicit
`created` and `updated` autodate fields (PocketBase 0.23+ does not add them).
`required` on a number field means non-zero, and on a bool means must be true:
use them only where that is intended.

Categories, used by `skills.category` and `needs.category` (select values are
the slugs):

| slug | label | emoji |
| --- | --- | --- |
| building | Building & Repair | 🔨 |
| making | Making & Crafts | 🧵 |
| art | Art & Design | 🎨 |
| tech | Tech & Coding | 💻 |
| organizing | Organizing & Admin | 🗂️ |
| teaching | Teaching & Tutoring | 📚 |
| languages | Languages & Translation | 🗣️ |
| cooking | Cooking & Food | 🍳 |
| garden | Garden & Outdoors | 🌱 |
| moving | Moving & Driving | 🚚 |
| care | Care (kids, pets, elders) | 🤲 |
| health | Health & Fitness | 💪 |
| music | Music & Performance | 🎵 |
| money | Money & Careers | 💼 |
| other | Other | ✨ |

`mode` select values everywhere: `in_person`, `remote`, `either`.

### users (built-in auth collection, modified)

| field | type | notes |
| --- | --- | --- |
| email, password, verified, emailVisibility | built-in | `emailVisibility` stays false; emails are never public. |
| name | text | existing field: make **required**, max 60. Display name. |
| avatar | file | existing field: max 1, ≤ 3 MB, enumerated image MIME types (no `image/*` wildcard, it matches nothing), thumbs `100x100`, `300x300`. |
| area | text | max 120. Display name of the member's town, e.g. "Brooklyn, New York, United States". |
| lat, lng | number | optional, town centre from the place search. |
| about | text | max 500. |
| taking_requests | bool | set to true on sign-up by a hook unless the body sets it. |
| adult | bool | **required** (must be true): the 18+ attestation. |
| suspended | bool | admin-only. Suspended members cannot log in and disappear from public lists. |

Rules:

- list: `suspended = false`
- view: `suspended = false || id = @request.auth.id`
- create: `@request.body.suspended:isset = false` (public sign-up)
- update: `id = @request.auth.id && @request.body.suspended:isset = false && (@request.body.adult:isset = false || @request.body.adult = true)`
- delete: `id = @request.auth.id` (relations below cascade, so a member's content goes with them)
- authRule: `suspended = false`
- manageRule: null. Password auth only, identity field `email`; OAuth2, OTP and MFA off.

### contacts (private contact method, one per member)

| field | type | notes |
| --- | --- | --- |
| user | relation → users | required, max 1, cascadeDelete. Unique index. |
| method | select | `email`, `phone`, `whatsapp`, `signal`, `telegram`, `other`; required |
| value | text | required, max 200 |
| note | text | max 200, e.g. "Texts are best after 6pm" |

Rules (owner only, for every operation; nobody else can ever read this collection):

- list/view/delete: `user = @request.auth.id`
- create: `@request.auth.id != "" && @request.body.user = @request.auth.id`
- update: `user = @request.auth.id && (@request.body.user:isset = false || @request.body.user = @request.auth.id)`

Contacts reach the other person only through the snapshot a hook copies into an
accepted request (see `requests`).

### skills

| field | type | notes |
| --- | --- | --- |
| user | relation → users | required, max 1, cascadeDelete |
| category | select | the 15 slugs, required |
| title | text | required, 2–80, e.g. "Patching drywall" |
| description | text | max 300 |
| mode | select | required |

Rules:

- list/view: `user.suspended = false`
- create: `@request.auth.id != "" && @request.body.user = @request.auth.id`
- update: `user = @request.auth.id && (@request.body.user:isset = false || @request.body.user = @request.auth.id)`
- delete: `user = @request.auth.id`

Indexes: `user`, `category`.

### needs

| field | type | notes |
| --- | --- | --- |
| user | relation → users | required, max 1, cascadeDelete |
| title | text | required, 3–100 |
| details | text | max 1000 |
| category | select | required |
| mode | select | required |
| area, lat, lng | text, number, number | copied from the poster's profile by the client, editable |
| when | text | max 80, e.g. "this weekend", "flexible" |
| status | select | `open`, `done`, `closed`; required |

Rules:

- list/view: `user.suspended = false`
- create: `@request.auth.id != "" && @request.body.user = @request.auth.id && @request.body.status = "open"`
- update: `user = @request.auth.id && (@request.body.user:isset = false || @request.body.user = @request.auth.id)`
- delete: `user = @request.auth.id`

Indexes: `user`, `(status, created)`.

### requests (the connection between two members)

`seeker` is always the person who needs help and `helper` the person helping,
whoever started it. `kind = ask`: the seeker started it (from a skill or
profile). `kind = offer`: the helper started it (from a need).

| field | type | notes |
| --- | --- | --- |
| kind | select | `ask`, `offer`; required |
| seeker | relation → users | required, cascadeDelete |
| helper | relation → users | required, cascadeDelete |
| skill | relation → skills | optional (asks from a skill card) |
| need | relation → needs | optional (offers); required in practice for offers |
| message | text | required, 1–500 |
| status | select | `pending`, `accepted`, `declined`, `withdrawn`, `done`; required |
| seeker_contact, helper_contact | json | **server-set only** (hook), snapshot of each side's contact at acceptance |

Allowed transitions (the recipient is the person who did not start it):

| from | to | who |
| --- | --- | --- |
| pending | accepted / declined | recipient (ask → helper, offer → seeker) |
| pending | withdrawn | initiator (ask → seeker, offer → helper) |
| accepted | done | either participant |

Rules:

- list/view: `@request.auth.id != "" && (seeker = @request.auth.id || helper = @request.auth.id)`
- create: authenticated; `status = "pending"`; and either
  - ask: seeker is me, helper is not me, helper has `taking_requests = true` and is not suspended; or
  - offer: helper is me, seeker is not me, `need` belongs to the seeker and is `open`.
- update: participants only; `kind`, `seeker`, `helper`, `skill`, `need`, `message`,
  `seeker_contact`, `helper_contact` must not be in the body; `status` must follow
  the transition table.
- delete: null (superusers only).

Write create/update as PocketBase rule expressions. Rules may reference the
would-be record's fields (`helper.taking_requests`) or `@request.body.*`; use
whichever 0.40.6 evaluates correctly and **prove it in the smoke test**.

Indexes (abuse limits): unique `(seeker, helper)` where `kind = 'ask' AND status = 'pending'`
(one pending ask per pair); unique `(helper, need)` where `kind = 'offer' AND status IN ('pending','accepted')`.
Also index `seeker`, `helper`, `need`.

Hook (`pb_hooks/requests.pb.js`):

- on create request: force `seeker_contact` and `helper_contact` empty.
- on update request: when status goes `pending → accepted`, set each `*_contact`
  to `{ method, value, note }` from that member's `contacts` record, falling back
  to `{ method: "email", value: <account email>, note: "" }`. On any other update,
  restore the stored values (clients can never write them).

### thanks (public thank-you notes)

| field | type | notes |
| --- | --- | --- |
| request | relation → requests | required, cascadeDelete, unique index (one per request) |
| author | relation → users | required, cascadeDelete (the seeker) |
| helper | relation → users | required, cascadeDelete |
| message | text | required, 2–300 |

Rules:

- list/view: `author.suspended = false && helper.suspended = false` (public)
- create: author is me; the request's seeker is me; the request is `done`; `helper` equals the request's helper.
- update: `author = @request.auth.id` and `author`, `helper`, `request` not in the body.
- delete: `author = @request.auth.id`

### helper_stats (view collection, public)

```sql
SELECT u.id AS id,
  (SELECT COUNT(DISTINCT r.seeker) FROM requests r WHERE r.helper = u.id AND r.status = 'done') AS helped_count,
  (SELECT COUNT(*) FROM thanks t WHERE t.helper = u.id) AS thanks_count
FROM users u
```

list/view rule: `""`. As built, the view uses `LEFT JOIN` + `GROUP BY` instead of
scalar subqueries, because PocketBase 0.40.6 infers scalar-subquery columns as
`json` rather than `number`; the counts are identical.

### reports

| field | type | notes |
| --- | --- | --- |
| reporter | relation → users | required, cascadeDelete |
| target_type | select | `user`, `skill`, `need`, `request`, `thanks`; required |
| target_id | text | required, max 30 |
| target_user | relation → users | optional, the member responsible (for the admin's convenience) |
| reason | select | `spam`, `scam`, `harassment`, `unsafe`, `inappropriate`, `other`; required |
| details | text | max 1000 |
| status | select | `open`, `resolved`, `dismissed`; required |

Rules: create `@request.auth.id != "" && @request.body.reporter = @request.auth.id && @request.body.status = "open"`;
list/view/update/delete null (superusers moderate in the dashboard).

### Other hooks

- `pb_hooks/users.pb.js`: on user create request, reject with 400 if the body has
  a non-empty `website` field (honeypot; not a real field), and set
  `taking_requests = true` unless the body sets it.

### Settings (migration)

- `meta.appName = "Many Hands"`, `meta.appURL = "https://manyhands.508.dev"`.
- Backups: none (`backups.cron = ""`). SMTP: off.
- `trustedProxy.headers = ["X-Forwarded-For"]`, `useLeftmostIP = false`: Traefik
  appends the real client IP last, and `manyhands.508.dev` is not behind Cloudflare.
- Rate limits **enabled**: keep PocketBase's default rules, and add a stricter
  `users:create` limit for guests (sign-ups), 5 per 10 minutes per IP.
  `127.0.0.1` is excluded so the in-container health check and the local smoke
  test are never throttled; real clients arrive through Traefik with their own
  IP in `X-Forwarded-For`.

## 4. Smoke test (required for any backend change)

`apps/pocketbase/scripts/smoke.sh` downloads the pinned PocketBase into `.bin/`
if missing (checksum-verified), starts it on a random port with a temp data dir
and this repo's migrations and hooks, creates a superuser with the CLI, and runs
`smoke_assert.ts` with bun. It exits non-zero on any failure and always cleans
up. Assertions must cover, at minimum:

- guests can list skills, needs, users and thanks, but never see emails or any `contacts`;
- sign-up fails without `adult = true` and with a filled `website` honeypot;
- a member cannot edit or delete another member's skill, need, contact or profile, or set `suspended` on themselves;
- a suspended member cannot log in and vanishes from public lists;
- the request flow end to end: ask → accept reveals both contact snapshots to both participants only; a third member sees nothing; illegal transitions (recipient withdraws, initiator accepts, pending → done, re-opening) are rejected; clients cannot write `*_contact`;
- asking someone with `taking_requests = false` fails; offering on your own need or a closed need fails; duplicate pending ask fails;
- thanks: only the seeker of a `done` request can thank, once, for that request's helper;
- `helper_stats` shows the right counts;
- reports: a member can create one, nobody but superusers can read them.

## 5. Frontend conventions

- Svelte 5 runes only (`$state`, `$derived`, `$effect`, `$props`); event
  attributes (`onclick`), no `export let`, no `$:`, no `on:click`.
- SPA: root `+layout.ts` exports `ssr = false`, `prerender = false`;
  adapter-static with `fallback: "index.html"`.
- Talk to PocketBase only through `src/lib/pb.ts`. Use `pb.filter()` for any
  filter with user input. Realtime: subscribe to `requests` for the unread badge
  (realtime respects the collection rules).
- Dev: Vite proxies `/api` and `/_` to `http://127.0.0.1:8090`.
- No UI component libraries. Plain CSS: global tokens in `src/app.css`, scoped
  component styles. Runtime dependencies are limited to `pocketbase`,
  `@fontsource/caveat` and `@fontsource/atkinson-hyperlegible` unless the
  orchestrator agrees otherwise.
- Every user-facing string comes from `src/lib/copy.ts` or a per-area module in
  `src/lib/copy/` (`account.ts`, `directory.ts`, `needs.ts`, `requests.ts`), so a
  translation touches only those files.
- `pb.autoCancellation(false)` is set in `pb.ts`: pages load several lists from
  the same collection at once, which the SDK would otherwise cancel.
- Mobile first: everything must work at 360 px wide. Bottom tab bar on phones
  (Skills, Needs, Requests with badge, Me), top bar on wider screens.
- Accessibility: WCAG 2.2 AA contrast; real `<button>`/`<a>`; every input has a
  label; visible focus; respect `prefers-reduced-motion`.
- `index.html` carries `<meta name="robots" content="noindex, nofollow">` and
  `static/robots.txt` disallows everything.

### Look: community corkboard

- Page background: cork (warm tan, e.g. `#b98b5e`, with subtle speckle via CSS
  gradients; no image files needed).
- Cards are index cards: paper `#fffaf0`, a thin red margin line under the
  title, faint blue ruled lines optional, soft drop shadow, a coloured push-pin
  at the top centre (CSS radial gradient), a slight tilt between −2° and 2°
  derived from the record id (stable across renders). Hover/focus straightens
  and lifts the card; no motion under `prefers-reduced-motion`.
- Headings and card titles: Caveat (700). Body: Atkinson Hyperlegible. Ink
  `#2b2118` on paper. Never put body text directly on cork; put headings on a
  paper "label" strip.
- Primary buttons: brick red `#b23a26` with white text. Pins and category
  accents use the category colour.

### Place search

`src/lib/geo.ts` queries Photon (`https://photon.komoot.io/api/?q=…&limit=6&lang=en`,
filtered to places), debounced ~350 ms, at least 3 characters, aborting stale
requests. Label = unique non-empty parts of `[name, state, country]`. Store the
label in `area` and the coordinates in `lat`/`lng`. Show "Place search by Photon ·
© OpenStreetMap contributors". Distance filter: bounding box in the PocketBase
filter (`user.lat`/`user.lng` for skills, `lat`/`lng` for needs), optionally
`|| mode != "in_person"` to keep remote-friendly items, then exact haversine on
the client for "X km away" and sorting.

## 6. Pages

| route | purpose |
| --- | --- |
| `/` | Landing: what Many Hands is, how it works in 3 steps, labelled example cards, latest real skills and needs if any, sign-up call to action. |
| `/skills` | Directory: corkboard of skill cards; filters: category chips, distance (Anywhere / 10 / 25 / 50 / 100 km from my area or a picked place), include remote, text search. |
| `/needs` | Needs board: open needs as cards; same filters; "Post a need". |
| `/needs/new`, `/needs/[id]/edit` | Need form. |
| `/needs/[id]` | Need detail: "I can help" (offer dialog), matching hint ("3 members list Building & Repair nearby" → filtered `/skills`), owner can mark done/closed or edit. |
| `/people/[id]` | Profile: avatar, name, area, about, taking requests, helped/thanks counts, skills (each with "Ask for help"), thank-you notes, Report. |
| `/me` | Edit my profile, place, contact method, taking-requests switch; my skills (add/edit/delete); my needs; open needs that match my skills; delete account. |
| `/requests` | Inbox: For you (incoming pending: accept/decline), Sent (withdraw), Active (contact reveal with tap links, Done), Past. Done by the seeker opens the thank-you dialog. |
| `/login`, `/signup` | Email + password. Sign-up asks name, email, password, 18+ checkbox; hidden honeypot `website` field. "Forgot password? Ask an admin; email resets are coming soon." |
| `/safety` | Staying safe: meet somewhere public first, tell someone where you're going, it's fine to say no, Many Hands doesn't vet members, how to report. |

Contact tap links: email → `mailto:`, phone → `tel:` and `sms:`, WhatsApp →
`https://wa.me/<digits>`, Signal → `https://signal.me/#p/<+number>`, Telegram →
`https://t.me/<username>`, other → plain text.

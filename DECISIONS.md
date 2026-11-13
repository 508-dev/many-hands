# Decisions

Product and technical decisions for **Many Hands**, made with the idea's owner
on 2026-11-13. Change them deliberately: update this file in the same PR.

## Product

| Topic | Decision |
| --- | --- |
| What it is | A skill-sharing network. Members list what they can help with and post what they need. Nobody pays: help is a gift. |
| Who can join | Anyone. Public sign-up, 18+ only (checkbox at sign-up). |
| Browsing | Anyone can browse skills, needs and profiles without an account. Asking, offering, posting and reporting need an account. The site is hidden from search engines for now (`noindex` + `robots.txt`). |
| Core loop | A skills directory ("I can help with…") and a needs board ("I need help with…"), linked: a need shows how many members list that category nearby, and your profile shows open needs that match your skills. |
| Connecting | A request flow. "Ask for help" (from a skill or profile) or "I can help" (on a need) sends a short message to the other person's Requests inbox. They accept or decline. Accepting shows each person the other's chosen contact method. Nobody else ever sees contact details. |
| Money-free model | Gratitude. After help happens, the person helped can mark the request done and leave a public thank-you on the helper's profile. Profiles show "helped N people". No balances, no star ratings. |
| Location | Members pick their town from an OpenStreetMap search (area name plus approximate coordinates). Skills and needs are marked In person, Remote or Either. Lists can filter by distance and show "X km away". |
| Skills | A fixed category list (see `docs/architecture.md`) plus the member's own title and a sentence. |
| Safety | 18+ attestation, a Report button on profiles, skills, needs, requests and thank-yous, admin suspension, a "Staying safe" page with a no-vetting notice, rate limits and a sign-up honeypot. Admins moderate in the PocketBase dashboard. |
| Empty start | No fake data. The landing page shows clearly labelled example cards; empty lists invite people to be first. |
| Language | English only. All UI wording lives in `apps/web/src/lib/copy.ts` so a translation is a small job later. |
| Look | Community corkboard: skills and needs are index cards pinned to a cork board, warm paper colours, hand-lettered headings, readable body text. |
| AI in the app | None for now. Natural-language matching is a possible stretch goal. |
| Stuff for Friends | Separate app. Link the two later. |

## Technical

| Topic | Decision |
| --- | --- |
| Stack | PocketBase 0.40.6 (auth, SQLite database, REST and realtime API, admin dashboard) plus a SvelteKit 2 single-page app built to static files and served by PocketBase from `pb_public`. One container, one origin. |
| Login | Email and password. No outgoing email yet: no verification, no reset emails. Admins reset passwords by hand. Email (Migadu SMTP), one-time-code login and request alerts come later. |
| Notifications | In-app unread badge on Requests, live via PocketBase realtime. |
| Backups | None for now (explicit decision). Data lives on a Coolify persistent volume, so redeploys keep it. |
| Hosting | Coolify at `coolify.508.dev`, app address `https://manyhands.508.dev`. Pushing to `main` deploys. |
| Repo | Public, `508-dev/many-hands`, AGPL-3.0. |
| Analytics | None. |

## Before inviting strangers

These were deliberately left out of the first evening's build and should land
before the link is shared beyond friends:

- Outgoing email: verification, password reset, request alerts.
- A CAPTCHA on sign-up (e.g. Cloudflare Turnstile) and the ability to block a user.
- Backups of `/pb/pb_data`, ideally off the server.
- A short privacy policy; then decide whether to let search engines index the site.

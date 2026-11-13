# Many Hands Agent Guide

Read [`DECISIONS.md`](DECISIONS.md) and
[`docs/architecture.md`](docs/architecture.md) before changing the app. They are
the product and technical contract; deliberate changes update the relevant
contract in the same PR.

## Commands

- `bun install --frozen-lockfile` — install the locked Bun workspace.
- `bun run dev` or `./scripts/dev.sh` — run PocketBase and Vite locally.
- `bun run lint` or `./scripts/lint.sh` — Biome checks.
- `bun run typecheck` or `./scripts/typecheck.sh` — Svelte and TypeScript checks.
- `bun run test` or `./scripts/test.sh` — PocketBase rules smoke test.
- `bun run build` — production SPA build.
- `bun run check` or `./scripts/check-all.sh` — all checks and the build.
- `bun run format` or `./scripts/format.sh` — format supported files.

## Working Rules

- Read target files, callers, exports, tests, and shared utilities before editing.
- Keep changes scoped; do not reformat unrelated files.
- Use Svelte 5 runes and keep every user-facing string in `apps/web/src/lib/copy.ts`.
- Talk to PocketBase only through `apps/web/src/lib/pb.ts`.
- Add or update tests when behaviour changes. Backend changes must pass the smoke test.
- Update `.env.example` when adding configuration and docs when workflows change.
- Keep `.dockerignore` aligned with generated output and local data.
- Use `.context/` for gitignored, workspace-local notes only. Durable knowledge
  belongs in tracked docs.
- Keep secrets in environment variables, never in git. Do not commit `.env`,
  PocketBase binaries, `pb_data`, or production/member data.

## Validation

Run the narrowest relevant checks while working. Before opening a broad change,
run `./scripts/check-all.sh`. The smoke script may arrive with the parallel
backend scaffold; do not replace it with a weaker frontend-only test.

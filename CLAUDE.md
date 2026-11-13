# Claude Code Instructions

The canonical agent instructions are in `AGENTS.md`. Product decisions live in
`DECISIONS.md`; the implementation contract is `docs/architecture.md`.

- Read before editing and keep changes scoped.
- Prefer repo-provided scripts and `bun run` for root tooling.
- Update `.env.example`, tests, and docs when contracts change.
- Use gitignored `.context/` for concise workspace-local operational memory.
  Promote durable knowledge into tracked docs instead of committing `.context/`.
- Never commit secrets, local PocketBase data, or real `.env` files.

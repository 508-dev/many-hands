# Local development

## Requirements

- Bun 1.4.2
- Docker 24 or newer for the production-image check
- Network access for the first PocketBase and dependency downloads

## Run the app

```sh
bun install --frozen-lockfile
bun run dev
```

`scripts/dev.sh` downloads the pinned PocketBase binary through
`apps/pocketbase/scripts/get-pocketbase.sh` when `.bin/pocketbase` is missing.
It then starts:

- PocketBase at <http://127.0.0.1:8090>, with development data in `.pb_data_dev/`;
- Vite at <http://127.0.0.1:5173>, proxying `/api` and `/_` to PocketBase.

Use the Vite address for the app. The PocketBase admin dashboard is at
<http://127.0.0.1:8090/_/>. Press Ctrl-C to stop both processes. Local binaries,
`.env` files, and PocketBase data are gitignored; never commit them.

## Checks

```sh
bun run lint       # Biome
bun run typecheck  # svelte-check and TypeScript
bun run build      # static production SPA in apps/web/build
bun run format     # apply Biome formatting
```

The stable shell wrappers in `scripts/` run the same commands. `bun run check`
runs lint, typecheck, the backend smoke test, and the production build.

## Backend smoke test

```sh
bun run smoke
# or: bun run test
```

This delegates to `apps/pocketbase/scripts/smoke.sh`. It downloads PocketBase if
needed, starts an isolated temporary instance on a random port, and exercises
the collection rules and request flow. It cleans up its process and data on
exit. The script is supplied with the backend scaffold; until that file exists,
the dedicated CI smoke job reports a notice and skips rather than pretending a
test ran.

## Production image

```sh
docker build -t many-hands:local .
docker run --rm -p 127.0.0.1:18090:8090 many-hands:local
```

Visit <http://127.0.0.1:18090>. This image includes the SPA, PocketBase,
migrations, and hooks. See [deployment](deployment.md) for persistent data and
superuser configuration.

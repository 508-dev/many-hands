# Deployment with Coolify

Many Hands deploys as one Docker container: PocketBase serves the API, admin
dashboard, and static SPA on port 8090. The production address is
<https://manyhands.508.dev>.

## Create the Coolify application

1. In Coolify at <https://coolify.508.dev>, create an application from the
   `508-dev/many-hands` GitHub repository and its `main` branch.
2. Select the **Dockerfile** build pack.
3. Set the base directory to `/` and the Dockerfile location to `/Dockerfile`.
4. Set the container port to `8090` and the health-check path to `/api/health`.
5. Add a persistent storage volume mounted at `/pb/pb_data`. This contains the
   SQLite database and uploaded files; do not store it only in the container.
6. Configure the application domain as `manyhands.508.dev` and let Coolify's
   proxy handle TLS.
7. Coolify project **Many Hands** `zq0w45wuwjaj3kttropysnck`, application
   `many-hands` `hrdpi4qp6m2wymjy9uhns9ba` (environment `production`, server
   Prod1), persistent storage `vfgwxb0yxjhhbarbutlfun4u` at `/pb/pb_data`.
   Coolify also sends `X-Robots-Tag: noindex` for the domain (`noindex_domains`).

The multi-stage Dockerfile builds `apps/web` with Bun, downloads and
checksum-verifies PocketBase 0.40.6, and copies migrations, hooks, and static
files into the runtime image.

## Runtime environment

Set these as runtime-only environment variables in Coolify, not build arguments:

```sh
PB_SUPERUSER_EMAIL=<admin email>
PB_SUPERUSER_PASSWORD=<long unique password>
```

When both are present, `docker-entrypoint.sh` idempotently upserts the superuser
before starting PocketBase. Keep the values in Coolify's secret environment
settings. Never commit them or expose them to the frontend build. If they are
unset, create a superuser manually with PocketBase's CLI before using the admin
dashboard.

The admin dashboard is at <https://manyhands.508.dev/_/>. Superusers are the
site moderators; protect those accounts accordingly.

`COOLIFY_URL` and `COOLIFY_API_TOKEN` in `.env.example` are optional operator
credentials for deployment automation. They are not needed by the running app
and must never be baked into the image.

## Automatic deploys

Each push to `main` deploys. A GitHub webhook on the repository (id
`711368483`, push events only) posts to Coolify's manual-webhook endpoint
`https://coolify.508.dev/webhooks/source/github/events/manual`, signed with the
secret stored on the application as `manual_webhook_secret_github` (operators
keep a copy as `GITHUB_WEBHOOK_SECRET` in the gitignored `.env`). Pushes to
other branches are ignored. Pull requests are checked by GitHub Actions, but
deploys are not gated on CI.

Operate the app from Coolify's API with the token in `.env`:

```bash
eval "$(grep -E '^COOLIFY_' .env | sed 's/^/export /; s/=\(.*\)$/="\1"/')"
api() { curl -sS -H "Authorization: Bearer $COOLIFY_API_TOKEN" "$COOLIFY_URL/api/v1$@"; }
api "/deployments/applications/$COOLIFY_APP_UUID" | jq '.deployments[:3]'   # recent deploys
api "/deploy?uuid=$COOLIFY_APP_UUID" -X POST                                # redeploy
```

## Data and backups

There are **no backups yet**. This is an explicit initial decision; see
`DECISIONS.md`. The persistent volume preserves data across ordinary redeploys,
but it is not a backup and does not protect against deletion or server loss.
Add tested, preferably off-server backups before inviting strangers.

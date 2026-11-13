# Security Policy

## Reporting Vulnerabilities

Do not open public issues for vulnerabilities or leaked secrets. Use GitHub's
private vulnerability reporting at
<https://github.com/508-dev/many-hands/security/advisories/new> so the
maintainers can investigate privately.

## Secret Handling

- Keep secrets in environment variables or the deployment platform's secret store.
- Never commit real `.env` files, tokens, private keys, credentials, or production data.
- Use `.env.example` for documented configuration only, with empty values.
- Never commit PocketBase's `pb_data` directory or other member data.

## Dependency Policy

Many Hands uses dependency cooldowns and locked installs:

- Bun: `minimumReleaseAge = 604800` in `bunfig.toml`.
- Renovate: `minimumReleaseAge = "7 days"`.
- CI and production builds use `bun install --frozen-lockfile`.

## GitHub Actions

Workflows use least-privilege permissions, pinned action SHAs,
`persist-credentials: false`, and `harden-runner` in audit mode.

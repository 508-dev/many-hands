# Many Hands

Many Hands is a community noticeboard for sharing skills and asking for help —
with **no money involved**. You might offer to mend a bike, help someone move a
couch, or share a creative skill online. Help is a gift, and a thank-you is the
only payment.

The site is at **<https://manyhands.508.dev>**. It is being built now, so some
pages may say “Coming soon.”

## How to use it

1. **Browse skills and needs.** You can look around without an account.
2. **Join when you want to take part.** Members must be 18 or older. Add what
   you can offer, or post something you need a hand with.
3. **Send a request.** Ask someone for help, or offer to answer their need.
   Contact details stay private until both people agree to connect.
4. **Help and say thanks.** Afterwards, the person helped can leave a public
   thank-you. There are no prices, balances, or star ratings.

Many Hands does not vet members. Meet in a public place first, tell someone
where you are going, and remember it is always fine to say no. Read the
[Staying safe page](https://manyhands.508.dev/safety) before meeting anyone.

## Developer quickstart

You need Bun 1.4.2. Docker is optional for local development and used for the
production image.

```sh
bun install --frozen-lockfile
bun run dev
```

Open <http://127.0.0.1:5173>. The dev script also starts PocketBase on
127.0.0.1:8090 and downloads its pinned binary if needed. Press Ctrl-C to stop
both servers.

Useful checks:

```sh
bun run lint
bun run typecheck
bun run test
bun run build
```

See [local development](docs/development.md),
[deployment](docs/deployment.md), [product decisions](DECISIONS.md), and the
[architecture contract](docs/architecture.md).

## Keep building it with AI

Open this repository in an AI coding agent and describe the change you want in
plain English. For example: “Let people filter the needs board by category, and
add tests for it.” You do not need to know the framework's terminology.

Agents should read [`AGENTS.md`](AGENTS.md) first. It points to the product and
architecture contracts and lists the checks to run. Review the proposed changes,
ask questions, and keep each change focused.

Licensed under the GNU AGPL-3.0.

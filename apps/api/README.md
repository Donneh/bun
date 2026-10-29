# @riftkeeper/api

Riftkeeper card API built with [Hono](https://hono.dev) for [Cloudflare Workers](https://developers.cloudflare.com/workers/). It serves the Riftbound card list from a committed snapshot, `data/cards.json`, which [`@riftkeeper/ingest`](../ingest/README.md) refreshes every day from the official [card gallery](https://playriftbound.com/en-us/card-gallery/).

## Run

Install from the workspace root (see the [root README](../../README.md)), then run these from `apps/api`:

```sh
bun run dev                # wrangler dev on http://localhost:3000, reloads on changes
bun run dev --port 4000    # use another port
bun run build              # bundle into dist/ with wrangler deploy --dry-run, without deploying
```

`bun run dev` runs the Worker in workerd, the Workers runtime, so local behavior matches production. Bun installs packages, runs scripts and runs the tests. `wrangler.jsonc` holds the Worker name, entry point and compatibility date.

The Worker code in `src` must not use Bun APIs. `bun run typecheck` checks `src` once with Bun types, for the tests, and once with only the Workers types (`tsconfig.worker.json`, which leaves out `*.test.ts`).

## Endpoints

| Method | Path         | Response                                          |
| ------ | ------------ | ------------------------------------------------- |
| GET    | `/cards`     | `200 { data: Card[] }`                            |
| GET    | `/cards/:id` | `200 { data: Card }`, `400` bad id, `404` no card |

Errors use the shape `{ error: { code, message } }`.

A card id is a lowercase slug of the card name and subtitle with apostrophes removed, for example `agonys-embrace` or `jinx-rebel`.

A `Card` holds the gameplay facts shared by all printings: `id`, `name`, `subtitle`, `type`, `supertype`, `domains` (can be empty), `energyCost`, `powerCost`, `might`, `mightBonus`, `ability`, `effect` and `tags`. Facts Riot does not give are `null`. Its `printings` array holds one entry per printed version with `id`, `publicCode`, `set`, `collectorNumber`, `variant`, `rarity`, `artist` (`null` when unknown), `imageUrl` and `orientation`. The schema lives in `packages/cards/src/card.ts`.

## Card snapshot

`src/cards/card-snapshot.ts` imports `data/cards.json`, so Wrangler bundles the snapshot into the Worker. The schema and parser live in `packages/cards/src/card-snapshot.ts`. The Worker validates the snapshot once when it starts, and a snapshot that does not match fails with one message instead of a list of Zod issues.

## Black-box tests

`bun run test:api` starts the Worker with `wrangler dev` on a free port, runs `test-api/` against it over HTTP and stops it. These tests know nothing about the code. They see only responses, so they catch what the in-process tests in `src` cannot, such as code that works in Bun but not in workerd. They use the real card snapshot, so assert on shapes and relations, not on specific cards.

Set `BASE_URL` to run the same tests against another server instead:

```sh
BASE_URL=https://api.example.com bun run test:api
```

The deploy workflow does this after every deploy, as a smoke test. With `BASE_URL` set, the runner first waits up to 3 minutes for `/cards` to answer with JSON, because a new custom domain answers with an empty 404 for about a minute before it routes to the Worker.

## Check

From `apps/api`, `bun run test`, `bun run test:api`, `bun run typecheck` and `bun run build` check only this package. Biome and the full `bun run check` run from the workspace root.

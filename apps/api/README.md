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

| Method | Path              | Response                                                                 |
| ------ | ----------------- | ------------------------------------------------------------------------ |
| GET    | `/health`         | `200 { data: { status: "ok", cards: number, version: string \| null } }` |
| GET    | `/cards`          | `200 { data: Card[] }`                                                   |
| GET    | `/cards/:id`      | `200 { data: Card }`, `400` bad id, `404` no card                        |
| GET    | `/search`         | `200 { data: Card[], meta, warnings, parsed }`, `400` bad parameters     |
| GET    | `/search/options` | `200 { data: { domains, types, supertypes, rarities, variants, sets } }` |

Errors use the shape `{ error: { code, message } }`.

Every response sends `Access-Control-Allow-Origin: *`, so a browser on any origin, such as the web app, can call the API. Only `GET` is allowed, and the API never asks for credentials.

A card id is a lowercase slug of the card name and subtitle with apostrophes removed, for example `agonys-embrace` or `jinx-rebel`.

A `Card` holds the gameplay facts shared by all printings: `id`, `name`, `subtitle`, `type`, `supertype`, `domains` (can be empty), `energyCost`, `powerCost`, `might`, `mightBonus`, `ability`, `effect` and `tags`. Facts Riot does not give are `null`. Its `printings` array holds one entry per printed version with `id`, `publicCode`, `set`, `collectorNumber`, `variant`, `rarity`, `artist` (`null` when unknown), `imageUrl` and `orientation`. The schema lives in `packages/cards/src/card.ts`.

## Search

`GET /search` takes these query parameters:

| Parameter   | Values                                                                | Default |
| ----------- | --------------------------------------------------------------------- | ------- |
| `q`         | A query in the syntax below, at most 512 characters                   | empty   |
| `sort`      | `set`, `collector_number`, `name`, `rarity`, `cost`, `might`, `power` | `set`   |
| `direction` | `asc`, `desc`                                                         | `asc`   |
| `page`      | 1 or higher, 40 cards per page                                        | `1`     |

A result is a card whose `printings` holds only the printings that matched. A card matches when one of its printings satisfies the whole query. `meta` holds `page`, `pageSize` and `total`. A malformed query never fails: the parts that could not be used come back in `warnings` (at most 20), each with a `message` and the `span` of the query it refers to. `parsed` lists the top-level filters a client can show as editable controls. The default sort is by set in release order: OGS, OGN, SFD, UNL, VEN, RAD.

### Query syntax

Bare words search the card name with its subtitle (`Annie, Fiery`) and match tags exactly. Words next to each other form one phrase.

| Filter      | Keywords                    | Example                                           |
| ----------- | --------------------------- | ------------------------------------------------- |
| Energy cost | `cost`                      | `cost:3`, `cost:>=5`, `cost:!=2`                  |
| Might       | `might`, `m`                | `m:<4`                                            |
| Power cost  | `power`, `p`                | `p:2`                                             |
| Domain      | `domain`, `d`, `c`, `color` | `c:fury,calm`, `c:fury+calm`, `c:-chaos`, `c:red` |
| Tag         | `tag`, `t`                  | `t:Ionia`                                         |
| Type        | `type`                      | `type:spell`                                      |
| Supertype   | `supertype`                 | `supertype:champion`                              |
| Rarity      | `rarity`, `r`               | `r:epic`                                          |
| Variant     | `variant`                   | `variant:alt-art`                                 |
| Set         | `set`, `s`                  | `s:ogn`, `s:origins`                              |
| Artist      | `artist`, `a`               | `a:kudos`                                         |
| Card text   | `ability`                   | `ability:"draw 1"`                                |

Numbers take `=`, `!=`, `<`, `<=`, `>` and `>=`. In a domain value, `,` means any of, `+` means all of and `-` means none of. Quote values with spaces. Combine with `and` (or just a space), `or`, `not` (or `-`) and parentheses, for example `(c:fury or c:chaos) -type:spell cost:<=3`.

`promo`, `owned`, `flavor`, `legal` and `keyword` existed in the old API; they are not supported yet and come back as warnings.

## Benchmark

`bun run benchmark:v8` bundles `scripts/benchmark.ts` and runs it under Node, which uses V8 like workerd. `bun run benchmark` runs it under Bun for a quicker look; Bun uses a different engine, so its numbers differ. The workspace root `bun run benchmark` runs the V8 version.

For each query it warms up, then reports p50 and p99 of the search core (parse, match, sort, page, decompose) and p50, p95 and p99 of the full request through the Hono app, including JSON serialization, plus the response size. It also times the snapshot validation that runs on every cold start. It exits with an error when a query that should match returns nothing or a request does not return 200, so a broken query cannot produce a fast number.

These are warm, in-process numbers. Production requests on lightly used Worker instances also pay for cold starts and unoptimized code; compare with CPU and wall time per route in Workers Observability.

## Card snapshot

`src/cards/card-snapshot.ts` imports `data/cards.json`, so Wrangler bundles the snapshot into the Worker. The schema and parser live in `packages/cards/src/card-snapshot.ts`. The Worker validates the snapshot once when it starts, and a snapshot that does not match fails with one message instead of a list of Zod issues.

## Black-box tests

`bun run test:api` starts the Worker with `wrangler dev` on a free port, runs `test-api/` against it over HTTP and stops it. These tests know nothing about the code. They see only responses, so they catch what the in-process tests in `src` cannot, such as code that works in Bun but not in workerd. They use the real card snapshot, so assert on shapes and relations, not on specific cards.

Set `BASE_URL` to run the same tests against another server instead:

```sh
BASE_URL=https://api.example.com bun run test:api
```

The deploy workflow does this after every deploy, as a smoke test. It also sets `EXPECTED_VERSION` to the Worker version it just deployed, and the runner waits until `/health` reports that version, because Cloudflare keeps serving the previous version in some locations for a short while after a deploy. `.github/workflows/monitor.yml` also runs the suite against production every 15 minutes; GitHub emails the repository owner when a run fails. With `BASE_URL` set, the runner first waits up to 3 minutes for `/health` to answer with JSON, because a new custom domain answers with an empty 404 for about a minute before it routes to the Worker.

## Check

From `apps/api`, `bun run test`, `bun run test:api`, `bun run typecheck` and `bun run build` check only this package. Biome and the full `bun run check` run from the workspace root.

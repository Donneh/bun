# riftkeeper

Bun workspaces monorepo for Riftkeeper, a card API for the Riftbound trading card game.

| Path              | Contents                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/api`        | `@riftkeeper/api`, the Hono API that serves the card snapshot ([README](apps/api/README.md))                     |
| `apps/ingest`     | `@riftkeeper/ingest`, the CLI that scrapes the gallery and writes the snapshot ([README](apps/ingest/README.md)) |
| `packages/cards`  | `@riftkeeper/cards`, the card schema, snapshot reader and test builders both apps share                          |
| `packages/search` | `@riftkeeper/search`, the card search query language, matching and sorting                                       |
| `infrastructure/` | OpenTofu configuration that deploys the API to Cloudflare Workers ([README](infrastructure/README.md))           |

New apps go in `apps/` and shared packages in `packages/`. Both folders are workspaces.

## Install

Requires the Bun version in `packageManager` in `package.json`.

```sh
bun install
```

Run it from this folder. There is one `bun.lock`, here at the workspace root.

## Everyday commands

Run these from this folder:

```sh
bun run dev         # run the API in the local Workers runtime on http://localhost:3000
bun run scrape      # refresh apps/api/data/cards.json, flags as in apps/ingest/README.md
bun run test        # bun test in every workspace
bun run test:api    # black-box HTTP tests against the API running in workerd
bun run benchmark   # search latency per query under V8, see apps/api/README.md
bun run typecheck   # tsc in every workspace
bun run build       # bundle the API Worker with wrangler deploy --dry-run, without deploying
bun run deploy      # build the API and tofu apply it to Cloudflare, see infrastructure/README.md
bun run lint        # biome lint over the whole repository
bun run format      # biome format --write over the whole repository
bun run check       # biome check, typecheck, test and build, as CI runs it
```

App-specific scripts, such as `build` in the API, live in that app's `package.json`. Run them from the app folder, or from here with a filter:

```sh
bun run --filter @riftkeeper/api build
```

Add a dependency to the workspace that uses it:

```sh
cd apps/api && bun add <package>
```

Only tooling that runs across the whole repository, such as Biome, belongs in the root `package.json`.
